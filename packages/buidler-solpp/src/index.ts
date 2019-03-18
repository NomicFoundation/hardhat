import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";
import { BuidlerConfig } from "@nomiclabs/buidler/types";
import { ensureDir, readFile, writeFile } from "fs-extra";
import path from "path";
import { processCode } from "solpp";

declare module "@nomiclabs/buidler/types" {
  interface BuidlerConfig {
    solpp?: {
      defs?: string;
      cwd?: string;
      name?: string;
      collapseEmptyLines?: boolean;
      noPreprocessor?: boolean;
      noFlatten?: boolean;
      tolerant?: boolean;
    };
  }
}

export const PROCESSED_CACHE_DIRNAME = "solpp-generated-contracts";

function getDefaultConfig(config: BuidlerConfig) {
  let sourcesPath = process.cwd();
  if (config.paths !== undefined && config.paths.sources !== undefined) {
    sourcesPath = config.paths.sources;
  }
  return {
    defs: {},
    cwd: sourcesPath,
    name: "buidler-solpp",
    collapseEmptyLines: false,
    noPreprocessor: false,
    noFlatten: false,
    tolerant: false
  };
}

function getConfig(config: BuidlerConfig) {
  const defaultConfig = getDefaultConfig(config);
  return { ...config.solpp, ...defaultConfig };
}

function readFiles(filePaths: string[]) {
  return Promise.all(
    filePaths.map(filePath =>
      readFile(filePath, "utf-8").then(content => [filePath, content])
    )
  );
}

task("buidler-solpp:run-solpp", async ({ files, opts }, { config, run }) => {
  const processedPaths: string[] = [];
  for (const [filePath, content] of files) {
    const processedFilePath = path.join(
      config.paths.cache,
      PROCESSED_CACHE_DIRNAME,
      path.relative(config.paths.sources, filePath)
    );

    await ensureDir(path.dirname(processedFilePath));

    const processedCode = await processCode(content, opts);

    await writeFile(processedFilePath, processedCode, "utf-8");

    processedPaths.push(processedFilePath);
  }

  return processedPaths;
});

task(TASK_COMPILE_GET_SOURCE_PATHS, async (_, { config, run }, runSuper) => {
  const filePaths: string[] = await runSuper();
  const files = await readFiles(filePaths);
  const opts = getConfig(config);

  return run("buidler-solpp:run-solpp", { files, opts });
});
