import type { EthereumProvider } from "hardhat/types/providers";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";

import {
  getMetadataSectionBytesLength,
  inferCompilerVersion,
} from "./metadata.js";

export class Bytecode {
  readonly #executableSection: string;

  private constructor(
    public readonly bytecode: string,
    public readonly compilerVersion: string,
    executableSection: string,
  ) {
    this.#executableSection = executableSection;
  }

  static async #parse(bytecode: string): Promise<Bytecode> {
    const bytecodeBytes = hexStringToBytes(bytecode);

    const compilerVersion = await inferCompilerVersion(bytecodeBytes);
    const executableSection = bytecode.slice(
      0,
      bytecode.length - getMetadataSectionBytesLength(bytecodeBytes) * 2,
    );

    return new Bytecode(bytecode, compilerVersion, executableSection);
  }

  public static async getDeployedContractBytecode(
    provider: EthereumProvider,
    address: string,
    networkName: string,
  ): Promise<Bytecode> {
    const response = await provider.request({
      method: "eth_getCode",
      params: [address, "latest"],
    });
    assertHardhatInvariant(
      typeof response === "string",
      "eth_getCode response is not a string",
    );
    const deployedBytecode = response.replace(/^0x/, "");

    if (deployedBytecode === "") {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.DEPLOYED_BYTECODE_NOT_FOUND,
        {
          address,
          networkName,
        },
      );
    }

    return Bytecode.#parse(deployedBytecode);
  }
}
