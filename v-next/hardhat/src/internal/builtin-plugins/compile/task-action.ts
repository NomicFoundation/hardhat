import type { HardhatRuntimeEnvironment } from "../../../types/hre.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";

import path from "node:path";

import { BuildSystem } from "@ignored/hardhat-vnext-build-system";
import { getCacheDir } from "@ignored/hardhat-vnext-utils/global-dir";

interface CompileActionArguments {
  quiet: boolean;
}

const compileWithHardhat: NewTaskActionFunction<
  CompileActionArguments
> = async ({ quiet }, hre) => {
  const config = await _resolveCompilationConfigFrom(hre);

  const buildSystem = new BuildSystem(config);

  await buildSystem.build({
    quiet,
  });
};

async function _resolveCompilationConfigFrom(hre: HardhatRuntimeEnvironment) {
  const root = hre.config.paths.root;
  const cache: string =
    hre.config.paths.cache !== ""
      ? hre.config.paths.cache
      : // TODO(#5599): Replace with hre.config.paths.cache once it is available
        await getCacheDir();

  const artifacts = path.join(root, "artifacts");
  const sources = path.join(root, "contracts");

  const compilationConfig = {
    paths: {
      root,
      cache,
      artifacts,
      sources,
    },
    solidity: {
      compilers: [
        {
          version: "0.8.25",
          settings: {
            optimizer: {
              enabled: true,
              runs: 200,
            },
          },
        },
      ],
      overrides: {},
    },
  };

  return compilationConfig;
}

export default compileWithHardhat;
