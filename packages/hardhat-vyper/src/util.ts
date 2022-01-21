import type { Debugger } from "debug";
import path from "path";

import type { Artifact } from "hardhat/types/artifacts";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";

import type {
  VyperUserConfig,
  MultiVyperConfig,
  ContractOutput,
} from "./types";
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
    abi: output.abi,
    bytecode: ensureHexPrefix(output.bytecode),
    deployedBytecode: ensureHexPrefix(output.bytecode_runtime),
    linkReferences: {},
    deployedLinkReferences: {},
  };
}
