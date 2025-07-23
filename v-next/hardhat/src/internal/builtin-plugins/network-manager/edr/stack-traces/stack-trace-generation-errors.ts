import { CustomError } from "@nomicfoundation/hardhat-utils/error";

abstract class StackTraceGenerationError extends CustomError {}

export class EdrProviderStackTraceGenerationError extends StackTraceGenerationError {
  constructor(error: Error) {
    super("Failed to generate stack trace for the EDR provider", error);
  }
}

export class SolidityTestStackTraceGenerationError extends StackTraceGenerationError {
  constructor(message: string) {
    super(
      "Failed to generate stack trace for the Solidity test",
      new Error(message),
    );
  }
}
