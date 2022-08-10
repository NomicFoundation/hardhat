import type { Debugger } from "debug";
import type { Artifact } from "hardhat/types/artifacts";
import type {
  VyperUserConfig,
  MultiVyperConfig,
  ContractOutput,
} from "./types";

import path from "path";

import { NomicLabsHardhatPluginError } from "hardhat/plugins";

import { ARTIFACT_FORMAT_VERSION, DEBUG_NAMESPACE } from "./constants";

export function getLogger(suffix: string): Debugger {
  const debug = require("debug");
  return debug(`${DEBUG_NAMESPACE}:${suffix}`);
}

export class VyperPluginError extends NomicLabsHardhatPluginError {
  constructor(message: string, parent?: Error, shouldBeReported?: boolean) {
    super("hardhat-vyper", message, parent, shouldBeReported);
  }
}

export function assertPluginInvariant(
  invariant: boolean,
  message: string
): asserts invariant {
  if (!invariant) {
    throw new VyperPluginError(message);
  }
}

export function normalizeVyperConfig(
  vyperConfig: VyperUserConfig
): MultiVyperConfig {
  if (typeof vyperConfig === "string") {
    return {
      compilers: [
        {
          version: vyperConfig,
        },
      ],
    };
  }

  if ("version" in vyperConfig) {
    return { compilers: [vyperConfig] };
  }

  return vyperConfig;
}

function ensureHexPrefix(hex: string) {
  return `${/^0x/i.test(hex) ? "" : "0x"}${hex}`;
}

/** Earlier versions of vyper have an gas estimate which is often
 * incorrect (https://github.com/vyperlang/vyper/issues/2151)*/
function removeGasEstimate(abi: string[]): string[] {
  return JSON.parse(JSON.stringify(abi), (key, value) => {
    if (key !== "gas") return value;
  });
}

/** Vyper contract names are taken from their file names, so we can convert directly */
function pathToContractName(file: string) {
  const sourceName = path.basename(file);
  return sourceName.substring(0, sourceName.indexOf("."));
}

export function getArtifactFromVyperOutput(
  sourceName: string,
  output: ContractOutput
): Artifact {
  const contractName = pathToContractName(sourceName);

  return {
    _format: ARTIFACT_FORMAT_VERSION,
    contractName,
    sourceName,
    abi: removeGasEstimate(output.abi),
    bytecode: ensureHexPrefix(output.bytecode),
    deployedBytecode: ensureHexPrefix(output.bytecode_runtime),
    linkReferences: {},
    deployedLinkReferences: {},
  };
}
