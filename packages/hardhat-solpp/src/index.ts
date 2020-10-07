import fsExtra from "fs-extra";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";
import { subtask } from "hardhat/config";
import { HardhatConfig } from "hardhat/types";
import path from "path";

import "./type-extensions";
import { SolppConfig } from "./types";

export const PROCESSED_CACHE_DIRNAME = "solpp-generated-contracts";

function getDefaultConfig(config: HardhatConfig): SolppConfig {
  return {
    defs: {},
    cwd: config.paths.sources,
    name: "hardhat-solpp",
    collapseEmptyLines: false,
    noPreprocessor: false,
    noFlatten: true,
    tolerant: false,
  };
}

function getConfig(config: HardhatConfig): SolppConfig {
  const defaultConfig = getDefaultConfig(config);
  return { ...defaultConfig, ...config.solpp };
}

async function readFiles(filePaths: string[]): Promise<string[][]> {
  return Promise.all(
    filePaths.map((filePath) =>
      fsExtra.readFile(filePath, "utf-8").then((content) => [filePath, content])
    )
  );
}

export default function () {
  subtask(
    "hardhat-solpp:run-solpp",
    async (
      { files, opts }: { files: string[][]; opts: SolppConfig },
      { config }: { config: HardhatConfig }
    ) => {
      const processedPaths: string[] = [];
      const solpp = await import("solpp");
      for (const [filePath, content] of files) {
        const processedFilePath = path.join(
          config.paths.cache,
          PROCESSED_CACHE_DIRNAME,
          path.relative(config.paths.sources, filePath)
        );

        await fsExtra.ensureDir(path.dirname(processedFilePath));

        const processedCode = await solpp.processCode(content, opts);

        await fsExtra.writeFile(processedFilePath, processedCode, "utf-8");

        processedPaths.push(processedFilePath);
      }

      return processedPaths;
    }
  );

  subtask(
    TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
    async (_, { config, run }, runSuper) => {
      const filePaths: string[] = await runSuper();
      const files = await readFiles(filePaths);
      const opts = getConfig(config);
      return run("hardhat-solpp:run-solpp", { files, opts });
    }
  );
}
