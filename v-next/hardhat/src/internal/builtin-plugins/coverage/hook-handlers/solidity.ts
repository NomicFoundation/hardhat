import type { SolidityHooks } from "../../../../types/hooks.js";
import type { CoverageMetadata } from "../types.js";

import path from "node:path";

import { addStatementCoverageInstrumentation } from "@ignored/edr-optimism";
import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { readUtf8File } from "@nomicfoundation/hardhat-utils/fs";
import debug from "debug";

import { unsafelyCastAsHardhatRuntimeEnvironmentImplementation } from "../helpers.js";

const log = debug("hardhat:core:coverage:hook-handlers:solidity");

// TODO: Change this value to a highly unlikely name instead. Ensure the name
// does NOT start with hardhat/ to avoid potential conflicts.
const COVERAGE_LIBRARY_IMPORT_PATH = "hardhat/coverage.sol";

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
        );

        // NOTE: This is not the most efficient implementation of line number
        // tracking. We should optimise this in the future.
        let lineNumber = 1;
        const lineNumbers = [];
        for (const character of fileContent) {
          lineNumbers.push(lineNumber);
          if (character === "\n") {
            lineNumber++;
          }
        }

        const coverageMetadata: CoverageMetadata = [];

        for (const m of metadata) {
          switch (m.kind) {
            case "statement":
              const tag = m.tag.toString("hex");
              const startLine = lineNumbers[m.startUtf16];
              const endLine = lineNumbers[m.endUtf16 - 1];
              coverageMetadata.push({
                sourceName,
                tag,
                startLine,
                endLine,
              });
              break;
            default:
              // NOTE: We don't support other kinds of metadata yet; we don't
              // want to start throwing errors if/when EDR adds support for
              // new kinds of coverage metadata though.
              log("Unsupported coverage metadata kind", m.kind);
              break;
          }
        }

        // NOTE: We need to cast the hre to the internal HardhatRuntimeEnvironmentImplementation
        // because the coverage manager (hre._coverage) is not exposed via the public interface
        const hreImplementation =
          unsafelyCastAsHardhatRuntimeEnvironmentImplementation(context);
        await hreImplementation._coverage.handleMetadata(coverageMetadata);

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
      if (solcInput.sources[COVERAGE_LIBRARY_IMPORT_PATH] !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.COVERAGE.IMPORT_PATH_ALREADY_DEFINED,
          {
            importPath: COVERAGE_LIBRARY_IMPORT_PATH,
          },
        );
      }

      // NOTE: We add the coverage.sol straight into sources here. The alternative
      // would be to do it during the resolution phase. However, we decided this
      // is a simpler solution, at least for now.
      const content = await readUtf8File(
        path.join(import.meta.dirname, "../../../../../../coverage.sol"),
      );
      solcInput.sources[COVERAGE_LIBRARY_IMPORT_PATH] = { content };
    }

    return next(context, solcInput);
  },
});
