import type { LoDashStatic } from "lodash";
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

function handleArr(v: any): any {
  if (Array.isArray(v)) return handleArr(v);
  else if (typeof v === "object") return deepCamel(v);
  return v;
}

export function deepCamel(obj: object): any {
  const { camelCase }: LoDashStatic = require("lodash");

  const newObj: { [k: string]: any } = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      newObj[camelCase(k)] = v.map(handleArr);
    } else if (typeof v === "object") {
      newObj[camelCase(k)] = deepCamel(v);
    } else {
      newObj[camelCase(k)] = v;
    }
  }
  return newObj;
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
    deployedBytecode: ensureHexPrefix(output.bytecodeRuntime),
    linkReferences: {},
    deployedLinkReferences: {},
  };
}
