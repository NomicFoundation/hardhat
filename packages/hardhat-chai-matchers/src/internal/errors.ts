import { CustomError } from "hardhat/common";

export class HardhatChaiMatchersDecodingError extends CustomError {
  constructor(encodedData: string, type: string, parent: Error) {
    const message = `There was an error decoding '${encodedData}' as a ${type}`;

    super(message, parent);
  }
}
