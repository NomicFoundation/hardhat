import { CustomError } from "./custom-errors.js";

export class BigIntError extends CustomError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}
