export class LoggedError {
  constructor(public readonly wrappedError: Error) {}
}

export function asLoggedError(error: Error): LoggedError {
  return new LoggedError(error);
}
