import type { SolidityHooks } from "../../../../types/hooks.js";
import type { CoverageMetadata } from "../types.js";

import path from "node:path";

import { getCoverageLibrary } from "@nomicfoundation/edr/coverage";
import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import debug from "debug";

import { getCoverageManager } from "../helpers/accessors.js";
import { instrumentSolidityFileForCompilationJob } from "../instrumentation.js";

const log = debug("hardhat:core:coverage:hook-handlers:solidity");

export default async (): Promise<Partial<SolidityHooks>> => ({
  preprocessProjectFileBeforeBuilding: async (
    context,
    sourceName,
    fsPath,
    fileContent,
    solcVersion,
    next,
  ) => {
    // NOTE: We do not want to instrument the test project files as we don't
    // want to report coverage for them.

    const isTestSource = (await context.solidity.getScope(fsPath)) === "tests";

    if (context.globalOptions.coverage && !isTestSource) {
      try {
        const { source, metadata } = instrumentSolidityFileForCompilationJob({
          compilationJobSolcVersion: solcVersion,
          sourceName,
          fileContent,
        });

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
              const relativePath = path.relative(
                context.config.paths.root,
                fsPath,
              );
              const tag = Buffer.from(m.tag).toString("hex");
              coverageMetadata.push({
                relativePath,
                tag,
                startUtf16: m.startUtf16,
                endUtf16: m.endUtf16,
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

        await getCoverageManager(context).addMetadata(coverageMetadata);

        return await next(context, sourceName, fsPath, source, solcVersion);
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
      return await next(context, sourceName, fsPath, fileContent, solcVersion);
    }
  },
  preprocessSolcInputBeforeBuilding: async (context, solcInput, next) => {
    if (context.globalOptions.coverage) {
      const coverageLib = getCoverageLibrary();

      // NOTE: We check for a source name clash here. It could happen if the user
      // wanted to compile a source with our highly unlikely name by chance or
      // if we accidentally tried to preprocess the same solc input twice.
      if (solcInput.sources[coverageLib.filename] !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CORE.COVERAGE.IMPORT_PATH_ALREADY_DEFINED,
          {
            importPath: coverageLib.filename,
          },
        );
      }

      // NOTE: We add the coverage.sol straight into sources here. The alternative
      // would be to do it during the resolution phase. However, we decided this
      // is a simpler solution, at least for now.
      solcInput.sources[coverageLib.filename] = {
        content: coverageLib.content,
      };
    }

    return await next(context, solcInput);
  },
});
