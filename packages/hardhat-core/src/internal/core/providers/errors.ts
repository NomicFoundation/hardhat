import { ProviderRpcError } from "../../../types";
import { CustomError } from "../errors";

export class ProviderError extends CustomError implements ProviderRpcError {
  public code: number;
  public data?: unknown;

  constructor(message: string, code: number, public readonly parent?: Error) {
    super(message, parent);
    this.code = code;
  }
}
