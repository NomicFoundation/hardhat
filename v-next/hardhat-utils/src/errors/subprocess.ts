import { CustomError } from "../error.js";

export class SubprocessFileNotFoundError extends CustomError {
  constructor(filePath: string) {
    super(
      `Cannot find the subprocess file to execute, invalid file path: ${filePath}`,
    );
  }
}

export class SubprocessPathIsDirectoryError extends CustomError {
  constructor(path: string) {
    super(
      `The provided path is a directory, only files are accepted. Path: ${path}`,
    );
  }
}
