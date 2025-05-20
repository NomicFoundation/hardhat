import type { SolidityHooks } from "../../../../types/hooks.js";

import path from "node:path";

import { addStatementCoverageInstrumentation } from "@ignored/edr-optimism";
import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../helpers.js";

const COVERAGE_LIBRARY_PATH =
  "__hardhat_coverage_library_a3e9cfe2-41b4-4a1f-ad9e-ac62dd82979e.sol";

export default async (): Promise<Partial<SolidityHooks>> => ({
  preprocessProjectFileBeforeBuilding: async (
    context,
    sourceName,
    fileContent,
    solcVersion,
    next,
  ) => {
    if (context.globalOptions.coverage) {
      try {
        // TODO: Pass the COVERAGE_LIBRARY_IMPORT_PATH as the next argument here
        // once the EDR supports it.
        const { source, metadata } = addStatementCoverageInstrumentation(
          fileContent,
          sourceName,
          solcVersion,
          COVERAGE_LIBRARY_PATH,
        );
        // NOTE: We need to cast the hre to the internal HardhatRuntimeEnvironmentImplementation
        // because the coverage manager (hre._coverage) is not exposed via the public interface
        const hreImplementation =
          unsafelyCastAsHardhatRuntimeEnvironmentImplementation(context);
        await hreImplementation._coverage.addMetadata(
          metadata.map((m) => {
            // NOTE: We cast the tag we receive from EDR to a hex string to make
            // it easier to debug.
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

        // NOTE: These could be raised if the source content we pass to EDR
        // cannot be parsed with a version of the parser we provided, for example.
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
  preprocessSolcInputBeforeBuilding: async (context, solcInput, next) => {
    if (context.globalOptions.coverage) {
      // NOTE: We check for a source name clash here. It could happen if the user
      // wanted to compile a source with our highly unlikely name by chance or
      // if we accidentally tried to preprocess the same solc input twice.
      if (solcInput.sources[COVERAGE_LIBRARY_PATH] !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.COVERAGE.IMPORT_PATH_ALREADY_DEFINED,
          {
            importPath: COVERAGE_LIBRARY_PATH,
          },
        );
      }

      // NOTE: We add the coverage.sol straight into sources here. The alternative
      // would be to do it during the resolution phase. However, we decided this
      // is a simpler solution, at least for now.
      const content = await readUtf8File(
        path.join(import.meta.dirname, "../../../../../../coverage.sol"),
      );
      solcInput.sources[COVERAGE_LIBRARY_PATH] = { content };
    }

    return next(context, solcInput);
  },
});
