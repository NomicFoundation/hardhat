import { CustomError } from "../error.js";

export class MutexTimeoutError extends CustomError {
  constructor(mutexLifespanInMs: number) {
    super(`Mutex execution timed out after ${mutexLifespanInMs} ms`);
  }
}
