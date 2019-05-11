import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { internalTask } from "@nomiclabs/buidler/config";
import { ResolvedBuidlerConfig } from "@nomiclabs/buidler/types";
import fsExtra from "fs-extra";
import path from "path";

import { SolppConfig } from "./types";

export const PROCESSED_CACHE_DIRNAME = "solpp-generated-contracts";

function getDefaultConfig(config: ResolvedBuidlerConfig): SolppConfig {
  return {
    defs: {},
    cwd: config.paths.sources,
    name: "buidler-solpp",
    collapseEmptyLines: false,
    noPreprocessor: false,
    noFlatten: true,
    tolerant: false
  };
}

function getConfig(config: ResolvedBuidlerConfig): SolppConfig {
  const defaultConfig = getDefaultConfig(config);
  return { ...defaultConfig, ...config.solpp };
}

async function readFiles(filePaths: string[]): Promise<string[][]> {
  return Promise.all(
    filePaths.map(filePath =>
      fsExtra.readFile(filePath, "utf-8").then(content => [filePath, content])
    )
  );
}

internalTask(
  "buidler-solpp:run-solpp",
  async (
    { files, opts }: { files: string[][]; opts: SolppConfig },
    { config }: { config: ResolvedBuidlerConfig }
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

internalTask(
  TASK_COMPILE_GET_SOURCE_PATHS,
  async (_, { config, run }, runSuper) => {
    const filePaths: string[] = await runSuper();
    const files = await readFiles(filePaths);
    const opts = getConfig(config);
    return run("buidler-solpp:run-solpp", { files, opts });
  }
);
