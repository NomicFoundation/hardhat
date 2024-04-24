import { CustomError } from "./custom-errors.js";

export class AbiError extends CustomError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}
