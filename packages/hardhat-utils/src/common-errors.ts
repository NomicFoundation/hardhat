import { CustomError } from "./error.js";

export class InvalidParameterError extends CustomError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}
