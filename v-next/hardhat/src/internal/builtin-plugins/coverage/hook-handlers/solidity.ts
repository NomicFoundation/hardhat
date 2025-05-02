import type { SolidityHooks } from "../../../../types/hooks.js";

import { addStatementCoverageInstrumentation } from "@ignored/edr-optimism";
import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../helpers.js";

export default async (): Promise<Partial<SolidityHooks>> => ({
  preprocessRootBeforeBuilding: async (
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
});
