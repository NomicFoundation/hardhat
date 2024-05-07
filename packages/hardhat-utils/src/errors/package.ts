import { CustomError } from "../error.js";

export class PackageJsonNotFoundError extends CustomError {
  constructor(filePathOrUrl: string, cause?: Error) {
    super(`No package.json found for ${filePathOrUrl}`, cause);
  }
}

export class PackageJsonReadError extends CustomError {
  constructor(packageJsonPath: string, cause?: Error) {
    super(`Failed to read package.json at ${packageJsonPath}`, cause);
  }
}
