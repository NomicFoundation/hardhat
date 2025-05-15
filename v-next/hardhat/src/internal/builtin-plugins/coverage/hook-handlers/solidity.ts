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
    // NOTE: We do not want to instrument the test project files as we don't
    // want to report coverage for them.
    const isTestSource =
      sourceName.startsWith(
        path.relative(
          context.config.paths.root,
          context.config.paths.tests.solidity,
        ),
      ) || sourceName.endsWith(".t.sol");

    if (context.globalOptions.coverage && !isTestSource) {
      try {
        const { source, metadata } = addStatementCoverageInstrumentation(
          fileContent,
          sourceName,
          solcVersion,
          COVERAGE_LIBRARY_PATH,
        );

        // TODO: Remove this once EDR starts returning line information as part
        // of the metadata.
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
              // NOTE: We don't support other kinds of metadata yet; however,
              // we don't want to start throwing errors if/when EDR adds support
              // for new kinds of coverage metadata.
              log("Unsupported coverage metadata kind", m.kind);
              break;
          }
        }

        // NOTE: We need to cast the hre to the internal HardhatRuntimeEnvironmentImplementation
        // because the coverage manager (hre._coverage) is not exposed via the public interface
        const hreImplementation =
          unsafelyCastAsHardhatRuntimeEnvironmentImplementation(context);
        await hreImplementation._coverage.addMetadata(coverageMetadata);

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
