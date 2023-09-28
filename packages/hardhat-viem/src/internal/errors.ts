import { NomicLabsHardhatPluginError } from "hardhat/plugins";

export class HardhatViemError extends NomicLabsHardhatPluginError {
  constructor(message: string, parent?: Error) {
    super("@nomicfoundation/hardhat-viem", message, parent);
  }
}

export class UnknownDevelopmentNetworkError extends HardhatViemError {
  constructor() {
    super(`The chain id corresponds to a development network but we couldn't detect which one.
Please report this issue if you're using Hardhat or Foundry.`);
  }
}

export class NetworkNotFoundError extends HardhatViemError {
  constructor(chainId: number) {
    super(
      `No network with chain id ${chainId} found. You can override the chain by passing it as a parameter to the client getter:

import { someChain } from "viem/chains";
const client = await hre.viem.getPublicClient({
  chain: someChain,
  ...
});

You can find a list of supported networks here: https://viem.sh/docs/clients/chains.html`
    );
  }
}

export class MultipleMatchingNetworksError extends HardhatViemError {
  constructor(chainId: number) {
    super(
      `Multiple networks with chain id ${chainId} found. You can override the chain by passing it as a parameter to the client getter:

import { someChain } from "viem/chains";
const client = await hre.viem.getPublicClient({
  chain: someChain,
  ...
});

You can find a list of supported networks here: https://viem.sh/docs/clients/chains.html`
    );
  }
}

export class DefaultWalletClientNotFoundError extends HardhatViemError {
  constructor(networkName: string) {
    super(
      `Default wallet client not found. This can happen if no accounts were configured for this network (network: '${networkName}').

Alternatively, you can set a custom wallet client by passing it as a parameter in the deployContract function:

const walletClient = await hre.viem.getWalletClient(address);
const contractA = await hre.viem.deployContract("A", [], { walletClient });
const contractB = await hre.viem.getContractAt("B", address, { walletClient });`
    );
  }
}

export class InvalidConfirmationsError extends HardhatViemError {
  constructor() {
    super(
      "deployContract does not support 0 confirmations. Use sendDeploymentTransaction if you want to handle the deployment transaction yourself."
    );
  }
}

export class DeployContractError extends HardhatViemError {
  constructor(txHash: string, blockNumber: bigint) {
    super(
      `The deployment transaction '${txHash}' was mined in block '${blockNumber}' but its receipt doesn't contain a contract address`
    );
  }
}
