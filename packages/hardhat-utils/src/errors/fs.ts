import { CustomError } from "../error.js";

// We use this error to encapsulate any other error possibly thrown by node's
// fs apis, as sometimes their errors don't have stack traces.
export class FileSystemAccessError extends CustomError {}

export class FileNotFoundError extends CustomError {
  constructor(filePath: string, cause?: Error) {
    super(`File ${filePath} not found`, cause);
  }
}

export class FileAlreadyExistsError extends CustomError {
  constructor(filePath: string, cause?: Error) {
    super(`File ${filePath} already exists`, cause);
  }
}

export class InvalidFileFormatError extends CustomError {
  constructor(filePath: string, cause: Error) {
    super(`Invalid file format: ${filePath}`, cause);
  }
}

export class JsonSerializationError extends CustomError {
  constructor(filePath: string, cause: Error) {
    super(`Error serializing JSON file ${filePath}`, cause);
  }
}

export class NotADirectoryError extends CustomError {
  constructor(filePath: string, cause: Error) {
    super(`Path ${filePath} is not a directory`, cause);
  }
}

export class IsDirectoryError extends CustomError {
  constructor(filePath: string, cause: Error) {
    super(`Path ${filePath} is a directory`, cause);
  }
}

export class DirectoryNotEmptyError extends CustomError {
  constructor(filePath: string, cause: Error) {
    super(`Directory ${filePath} is not empty`, cause);
  }
}
