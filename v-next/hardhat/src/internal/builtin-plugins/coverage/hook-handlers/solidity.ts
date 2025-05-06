import type { SolidityHooks } from "../../../../types/hooks.js";

import path from "node:path";

import { addStatementCoverageInstrumentation } from "@ignored/edr-optimism";
import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../helpers.js";

const COVERAGE_LIBRARY_IMPORT_PATH = "hardhat/coverage.sol";

export default async (): Promise<Partial<SolidityHooks>> => ({
  preprocessFileBeforeBuilding: async (
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
      if (sources[COVERAGE_LIBRARY_IMPORT_PATH] !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.COVERAGE.IMPORT_PATH_ALREADY_DEFINED,
          {
            importPath: COVERAGE_LIBRARY_IMPORT_PATH,
          },
        );
      }

      const content = await readUtf8File(
        path.join(import.meta.dirname, "../../../../../../coverage.sol"),
      );
      sources[COVERAGE_LIBRARY_IMPORT_PATH] = { content };
    }

    return next(context, sources);
  },
});
