import { CustomError } from "../error.js";

export class LinkReferenceError extends CustomError {
  constructor(sourceName: string, contractName: string) {
    super(`Link references for "${sourceName}:${contractName}" are undefined.`);
  }
}
