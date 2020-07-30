export class ForkStateManagerError extends Error {}

export class NotSupportedError extends ForkStateManagerError {
  constructor(operation: string) {
    super(`${operation} is not supported when forking from remote network`);
  }
}
