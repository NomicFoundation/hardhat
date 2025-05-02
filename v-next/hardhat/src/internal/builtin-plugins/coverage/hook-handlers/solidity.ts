import type { SolidityHooks } from "../../../../types/hooks.js";

import path from "node:path";

import { addStatementCoverageInstrumentation } from "@ignored/edr-optimism";
import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../helpers.js";

export default async (): Promise<Partial<SolidityHooks>> => ({
  preprocessRootProjectFileBeforeBuilding: async (
    context,
    sourceName,
    fileContent,
    solcVersion,
    next,
  ) => {
    if (context.globalOptions.coverage) {
      try {
        const { source, metadata } = addStatementCoverageInstrumentation(
          fileContent,
          sourceName,
          solcVersion,
        );
        const hreImplementation =
          unsafelyCastAsHardhatRuntimeEnvironmentImplementation(context);
        await hreImplementation._coverage.addMetadata(
          metadata.map((m) => {
            const tag = m.tag.toString("hex");
            return {
              ...m,
              tag,
              sourceName,
            };
          }),
        );

        return await next(context, sourceName, source, solcVersion);
      } catch (e) {
        ensureError(e);

        throw new HardhatError(
          HardhatError.ERRORS.CORE.COVERAGE.SOURCE_NOT_INSTRUMENTED,
          {
            sourceName,
          },
          e,
        );
      }
    } else {
      return next(context, sourceName, fileContent, solcVersion);
    }
  },
  preprocessSolcInputSourcesBeforeBuilding: async (context, sources, next) => {
    if (context.globalOptions.coverage) {
      assertHardhatInvariant(
        sources["hardhat/coverage.sol"] === undefined,
        'The "hardhat/coverage.sol" entry should not exist in the sources.',
      );

      const content = await readUtf8File(
        path.join(import.meta.dirname, "../../../../../../coverage.sol"),
      );
      sources["hardhat/coverage.sol"] = { content };
    }

    return next(context, sources);
  },
});
