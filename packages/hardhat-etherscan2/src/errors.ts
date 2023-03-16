import { NomicLabsHardhatPluginError } from "hardhat/plugins";

export class HardhatEtherscanError extends NomicLabsHardhatPluginError {
  constructor(message: string, parent?: Error) {
    super("@nomiclabs/hardhat-etherscan", message, parent);
  }
}
