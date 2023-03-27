import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { TASK_VERIFY_VERIFY } from "./task-names";

export class HardhatEtherscanError extends NomicLabsHardhatPluginError {
  constructor(message: string, parent?: Error) {
    super("@nomiclabs/hardhat-etherscan", message, parent);
  }
}

export class MissingAddressError extends HardhatEtherscanError {
  constructor() {
    super(
      "You didn’t provide any address. Please re-run the 'verify' task with the address of the contract you want to verify."
    );
  }
}

export class InvalidAddressError extends HardhatEtherscanError {
  constructor(address: string) {
    super(`${address} is an invalid address.`);
  }
}

export class InvalidContractNameError extends HardhatEtherscanError {
  constructor(contractName: string) {
    super(`A valid fully qualified name was expected. Fully qualified names look like this: "contracts/AContract.sol:TheContract"
Instead, this name was received: ${contractName}`);
  }
}

export class MissingApiKeyError extends HardhatEtherscanError {
  constructor(network: string) {
    super(`You are trying to verify a contract in '${network}', but no API token was found for this network. Please provide one in your hardhat config. For example:

{
  ...
  etherscan: {
    apiKey: {
      ${network}: 'your API key'
    }
  }
}

See https://etherscan.io/apis`);
  }
}

export class InvalidConstructorArguments extends HardhatEtherscanError {
  constructor() {
    super(`The constructorArguments parameter should be an array.
If your constructor has no arguments pass an empty array. E.g:

  await run("${TASK_VERIFY_VERIFY}", {
    <other args>,
    constructorArguments: []
  };`);
  }
}

export class InvalidConstructorArgumentsModule extends HardhatEtherscanError {
  constructor(constructorArgsModulePath: string) {
    super(`The module ${constructorArgsModulePath} doesn't export a list. The module should look like this:

module.exports = [ arg1, arg2, ... ];`);
  }
}

export class InvalidLibraries extends HardhatEtherscanError {
  constructor() {
    super(`The libraries parameter should be a dictionary.
If your contract does not have undetectable libraries pass an empty object or omit the argument. E.g:

  await run("${TASK_VERIFY_VERIFY}", {
    <other args>,
    libraries: {}
  };`);
  }
}

export class InvalidLibrariesModule extends HardhatEtherscanError {
  constructor(librariesModulePath: string) {
    super(`The module ${librariesModulePath} doesn't export a dictionary. The module should look like this:

module.exports = { lib1: "0x...", lib2: "0x...", ... };`);
  }
}

export class ImportingModuleError extends HardhatEtherscanError {
  constructor(module: string, error: Error) {
    super(
      `Importing the module for the ${module} failed.
Reason: ${error.message}`,
      error
    );
  }
}

export class ChainConfigNotFoundError extends HardhatEtherscanError {
  constructor(chainId: number) {
    super(`Trying to verify a contract in a network with chain id ${chainId}, but the plugin doesn't recognize it as a supported chain.

You can manually add support for it by following these instructions: https://hardhat.org/verify-custom-networks

To see the list of supported networks, run this command:

  npx hardhat verify --list-networks`);
  }
}

export class ContractVerificationError extends HardhatEtherscanError {
  constructor(url: string, error: Error) {
    super(
      `Failed to send contract verification request.
Endpoint URL: ${url}
Reason: ${error.message}`,
      error
    );
  }
}

export class ContractVerificationInvalidStatusCodeError extends HardhatEtherscanError {
  constructor(url: string, statusCode: number, responseText: string) {
    super(`Failed to send contract verification request.
Endpoint URL: ${url}
The HTTP server response is not ok. Status code: ${statusCode} Response text: ${responseText}`);
  }
}

export class ContractVerificationMissingBytecodeError extends HardhatEtherscanError {
  constructor(url: string, contractAddress: string) {
    super(`Failed to send contract verification request.
Endpoint URL: ${url}
Reason: The Etherscan API responded that the address ${contractAddress} does not have bytecode.
This can happen if the contract was recently deployed and this fact hasn't propagated to the backend yet.
Try waiting for a minute before verifying your contract. If you are invoking this from a script,
try to wait for five confirmations of your contract deployment transaction before running the verification subtask.`);
  }
}

export class ContractStatusPollingError extends HardhatEtherscanError {
  constructor(url: string, error: Error) {
    super(
      `Failure during etherscan status polling. The verification may still succeed but
should be checked manually.
Endpoint URL: ${url}
Reason: ${error.message}`,
      error
    );
  }
}

export class ContractStatusPollingInvalidStatusCodeError extends HardhatEtherscanError {
  constructor(statusCode: number, responseText: string) {
    super(
      `The HTTP server response is not ok. Status code: ${statusCode} Response text: ${responseText}`
    );
  }
}

export class ContractStatusPollingResponseNotOkError extends HardhatEtherscanError {
  constructor(message: string) {
    super(`The Etherscan API responded with a failure status.
The verification may still succeed but should be checked manually.
Reason: ${message}`);
  }
}

export class EtherscanVersionNotSupportedError extends HardhatEtherscanError {
  constructor() {
    super(`Etherscan only supports compiler versions 0.4.11 and higher.
See https://etherscan.io/solcversions for more information.`);
  }
}

export class DeployedBytecodeNotFound extends HardhatEtherscanError {
  constructor(address: string, network: string) {
    super(`The address ${address} has no bytecode. Is the contract deployed to this network?
The selected network is ${network}.`);
  }
}

export class CompilerVersionsMismatchError extends HardhatEtherscanError {
  constructor(
    configCompilerVersions: string[],
    inferredCompilerVersion: string,
    network: string
  ) {
    const versionDetails =
      configCompilerVersions.length > 1
        ? `versions are: ${configCompilerVersions.join(", ")}`
        : `version is: ${configCompilerVersions[0]}`;

    super(`The contract you want to verify was compiled with solidity ${inferredCompilerVersion}, but your configured compiler ${versionDetails}.

Possible causes are:
- You are not in the same commit that was used to deploy the contract.
- Wrong compiler version selected in hardhat config.
- The given address is wrong.
- The selected network (${network}) is wrong.`);
  }
}

export class ContractNotFoundError extends HardhatEtherscanError {
  constructor(contractFQN: string) {
    super(`The contract ${contractFQN} is not present in your project.`);
  }
}

export class BuildInfoNotFoundError extends HardhatEtherscanError {
  constructor(contractFQN: string) {
    super(`The contract ${contractFQN} is present in your project, but we couldn't find its sources.
Please make sure that it has been compiled by Hardhat and that it is written in Solidity.`);
  }
}

export class BuildInfoCompilerVersionMismatchError extends HardhatEtherscanError {
  constructor(
    contractFQN: string,
    compilerVersion: string,
    isVersionRange: boolean,
    buildInfoCompilerVersion: string,
    network: string
  ) {
    const versionDetails = isVersionRange
      ? `a solidity version in the range ${compilerVersion}`
      : `the solidity version ${compilerVersion}`;

    super(`The contract ${contractFQN} is being compiled with ${buildInfoCompilerVersion}.
However, the contract found in the address provided as argument has its bytecode marked with ${versionDetails}.

Possible causes are:
- Solidity compiler version settings were modified after the deployment was executed.
- The given address is wrong.
- The selected network (${network}) is wrong.`);
  }
}

export class DeployedBytecodeMismatchError extends HardhatEtherscanError {
  constructor(network: string) {
    super(`The address provided as argument contains a contract, but its bytecode doesn't match any of your local contracts.

Possible causes are:
  - Contract code changed after the deployment was executed. This includes code for seemingly unrelated contracts.
  - A solidity file was added, moved, deleted or renamed after the deployment was executed. This includes files for seemingly unrelated contracts.
  - Solidity compiler settings were modified after the deployment was executed (like the optimizer, target EVM, etc.).
  - The given address is wrong.
  - The selected network (${network}) is wrong.`);
  }
}

export class DeployedBytecodeMultipleMatchesError extends HardhatEtherscanError {
  constructor(fqnMatches: string[]) {
    super(`More than one contract was found to match the deployed bytecode.
Please use the contract parameter with one of the following contracts:
${fqnMatches.map((fqName) => `  * ${fqName}`).join("\n")}

For example:

hardhat verify --contract contracts/Example.sol:ExampleContract <other args>

If you are running the verify subtask from within Hardhat instead:

await run("${TASK_VERIFY_VERIFY}", {
<other args>,
contract: "contracts/Example.sol:ExampleContract"
};`);
  }
}
