import type { JsonFragment } from "@ethersproject/abi";
import type {
  Interceptable,
  TestDispatcher,
} from "@nomicfoundation/hardhat-utils/request";
import type { ResolvedConfigurationVariable } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type {
  EthereumProvider,
  RequestArguments,
} from "hardhat/types/providers";

import assert from "node:assert/strict";
import EventEmitter from "node:events";
import { afterEach, beforeEach } from "node:test";

import { getUnprefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import { getTestDispatcher } from "@nomicfoundation/hardhat-utils/request";

import { encodeConstructorArgs } from "../src/internal/constructor-args.js";

export class MockEthereumProvider
  extends EventEmitter
  implements EthereumProvider
{
  public callCount = 0;

  constructor(public returnValues: Record<string, any> = {}) {
    super();
  }

  public async request(args: RequestArguments): Promise<any> {
    if (this.returnValues[args.method] !== undefined) {
      this.callCount++;
      return this.returnValues[args.method];
    }

    throw new Error("Method not supported");
  }

  public close(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public send(): Promise<any> {
    throw new Error("Method not implemented.");
  }
  public sendAsync(): void {
    throw new Error("Method not implemented.");
  }
}

interface InitializeOptions {
  url?: string;
  timeout?: number;
}

interface PendingInterceptorInternal {
  method?: string | RegExp | ((path: string) => boolean);
  path: string | RegExp | ((path: string) => boolean);
  times: number | null;
  timesInvoked?: number;
}

export function initializeTestDispatcher(options: InitializeOptions = {}): {
  readonly interceptable: Interceptable;
} {
  const { url = "http://localhost", timeout } = options;

  let mockAgent: TestDispatcher;
  let interceptable: Interceptable;

  beforeEach(async () => {
    mockAgent = await getTestDispatcher({ timeout });
    interceptable = mockAgent.get(url);
    mockAgent.disableNetConnect();
  });

  afterEach(async () => {
    const pendingInterceptors = mockAgent.pendingInterceptors();

    if (pendingInterceptors.length > 0) {
      const format = (v: string | RegExp | Function | undefined) =>
        typeof v === "string"
          ? v
          : v instanceof RegExp
            ? v.toString()
            : typeof v === "function"
              ? "[Function]"
              : "[undefined]";

      const formatted = pendingInterceptors
        .map(
          ({
            method,
            path,
            times = 0,
            timesInvoked = 0,
          }: PendingInterceptorInternal) =>
            `${format(method)} ${format(path)} (invoked: ${timesInvoked}/${times})`,
        )
        .join("\n  ");

      assert.fail(
        `❌ Not all interceptors were consumed.\n  Pending:\n  ${formatted}`,
      );
    }

    mockAgent.enableNetConnect();
    await mockAgent.close();
  });

  return {
    get interceptable() {
      return interceptable;
    },
  };
}

export async function deployContract(
  contractName: string,
  constructorArgs: unknown[],
  libraries: Record<string, string>,
  hre: HardhatRuntimeEnvironment,
  provider: EthereumProvider,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing
  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  const deployer = accounts[0];

  const artifact = await hre.artifacts.readArtifact(contractName);

  let bytecode = artifact.bytecode;
  if (Object.keys(libraries).length > 0) {
    for (const [_, sourceLibraries] of Object.entries(
      artifact.linkReferences,
    )) {
      for (const [libName, libOffsets] of Object.entries(sourceLibraries)) {
        const libAddress = libraries[libName];
        const hex = getUnprefixedHexString(libAddress).toLowerCase();
        for (const { start, length } of libOffsets) {
          const offset = 2 + start * 2;
          bytecode =
            bytecode.slice(0, offset) +
            hex +
            bytecode.slice(offset + length * 2);
        }
      }
    }
  }

  const encodecConstructorArgs = await encodeConstructorArgs(
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing
    artifact.abi as JsonFragment[],
    constructorArgs,
    contractName,
  );

  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: deployer,
        data: bytecode + encodecConstructorArgs,
      },
    ],
  });

  while (true) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt !== undefined) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- testing
      return (receipt as any).contractAddress;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export class MockResolvedConfigurationVariable
  implements ResolvedConfigurationVariable
{
  public _type: "ResolvedConfigurationVariable" =
    "ResolvedConfigurationVariable";
  public format: string = "{variable}";
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  public async get(): Promise<string> {
    return this.#value;
  }

  public async getUrl(): Promise<string> {
    return this.#value;
  }

  public async getBigInt(): Promise<bigint> {
    return BigInt(this.#value);
  }

  public async getHexString(): Promise<string> {
    return this.#value;
  }
}
