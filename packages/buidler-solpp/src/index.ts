import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { internalTask, task } from "@nomiclabs/buidler/config";
import { ResolvedBuidlerConfig, SolppConfig } from "@nomiclabs/buidler/types";
import path from "path";

declare module "@nomiclabs/buidler/types" {
  interface SolppConfig {
    defs: any;
    cwd: string;
    name: string;
    collapseEmptyLines: boolean;
    noPreprocessor: boolean;
    noFlatten: boolean;
    tolerant: boolean;
  }

  interface BuidlerConfig {
    solpp: Partial<SolppConfig>;
  }
}

export const PROCESSED_CACHE_DIRNAME = "solpp-generated-contracts";

function getDefaultConfig(config: ResolvedBuidlerConfig): SolppConfig {
  return {
    defs: {},
    cwd: config.paths.sources,
    name: "buidler-solpp",
    collapseEmptyLines: false,
    noPreprocessor: false,
    noFlatten: false,
    tolerant: false
  };
}

function getConfig(config: ResolvedBuidlerConfig): SolppConfig {
  const defaultConfig = getDefaultConfig(config);
  return { ...defaultConfig, ...config.solpp };
}

async function readFiles(filePaths: string[]): Promise<string[][]> {
  const fsExtra = await import("fs-extra");

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
    const fsExtra = await import("fs-extra");
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

task(TASK_COMPILE_GET_SOURCE_PATHS, async (_, { config, run }, runSuper) => {
  const filePaths: string[] = await runSuper();
  const files = await readFiles(filePaths);
  const opts = getConfig(config);

  return run("buidler-solpp:run-solpp", { files, opts });
});
