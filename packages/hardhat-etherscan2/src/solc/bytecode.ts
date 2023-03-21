import { EthereumProvider } from "hardhat/types";
import { DeployedBytecodeNotFound } from "../errors";
import { inferCompilerVersion } from "./metadata";

// If the compiler output bytecode is OVM bytecode, we need to make a fix to account for a bug in some versions of
// the OVM compiler. The artifact’s deployedBytecode is incorrect, but because its bytecode (initcode) is correct, when we
// actually deploy contracts, the code that ends up getting stored on chain is also correct. During verification,
// Etherscan will compile the source code, pull out the artifact’s deployedBytecode, and then perform the
// below find and replace, then check that resulting output against the code retrieved on chain from eth_getCode.
// We define the strings for that find and replace here, and use them later so we can know if the bytecode matches
// before it gets to Etherscan.
// Source: https://github.com/ethereum-optimism/optimism/blob/8d67991aba584c1703692ea46273ea8a1ef45f56/packages/contracts/src/contract-dumps.ts#L195-L204
const OVM_FIND_OPCODES =
  "336000905af158601d01573d60011458600c01573d6000803e3d621234565260ea61109c52";
const OVM_REPLACE_OPCODES =
  "336000905af158600e01573d6000803e3d6000fd5b3d6001141558600a015760016000f35b";

export class Bytecode {
  private _version: string;
  private _isOvm: boolean;

  constructor(bytecode: string) {
    this._version = inferCompilerVersion(Buffer.from(bytecode, "hex"));

    // Check if this is OVM bytecode by looking for the concatenation of the two opcodes defined here:
    // https://github.com/ethereum-optimism/optimism/blob/33cb9025f5e463525d6abe67c8457f81a87c5a24/packages/contracts/contracts/optimistic-ethereum/OVM/execution/OVM_SafetyChecker.sol#L143
    //   - This check would only fail if the EVM solidity compiler didn't use any of the following opcodes: https://github.com/ethereum-optimism/optimism/blob/c42fc0df2790a5319027393cb8fa34e4f7bb520f/packages/contracts/contracts/optimistic-ethereum/iOVM/execution/iOVM_ExecutionManager.sol#L94-L175
    //     This is the list of opcodes that calls the OVM execution manager. But the current solidity
    //     compiler seems to add REVERT in all cases, meaning it currently won't happen and this check
    //     will always be correct.
    //   - It is possible, though very unlikely, that this string appears in the bytecode of an EVM
    //     contract. As a result result, this _isOvm flag should only be used after trying to infer
    //     the solc version
    //   - We need this check because OVM bytecode has no metadata, so when verifying
    //     OVM bytecode the check in `inferSolcVersion` will always return `MISSING_METADATA_VERSION_RANGE`.
    this._isOvm = bytecode.includes(OVM_REPLACE_OPCODES);
  }

  public getVersion() {
    return this._version;
  }

  public isOvm() {
    return this._isOvm;
  }

  public async getMatchingVersions(versions: string[]) {
    const semver = await import("semver");

    const matchingCompilerVersions = versions.filter((version) =>
      semver.satisfies(version, this._version)
    );

    return matchingCompilerVersions;
  }

  public static async getDeployedContractBytecode(
    address: string,
    provider: EthereumProvider,
    network: string
  ): Promise<Bytecode> {
    const response: string = await provider.send("eth_getCode", [
      address,
      "latest",
    ]);
    const deployedBytecode = response.replace(/^0x/, "");

    if (deployedBytecode === "") {
      throw new DeployedBytecodeNotFound(address, network);
    }

    return new Bytecode(deployedBytecode);
  }
}
