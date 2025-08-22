import { CustomError } from "@nomicfoundation/hardhat-utils/error";

export class RpcValidationError extends CustomError {
  constructor(reason: string) {
    super(
      `Validation of parameters against the schemas failed for the following reason: ${reason}`,
    );
  }
}
