import { NomicLabsHardhatPluginError } from "hardhat/plugins";

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
