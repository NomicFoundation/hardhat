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
