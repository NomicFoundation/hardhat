import { CustomError } from "hardhat/common";

export class HardhatEtherscanError extends CustomError {
  constructor(message: string) {
    super(message);
  }
}
