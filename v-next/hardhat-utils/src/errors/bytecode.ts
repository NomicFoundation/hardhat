import { CustomError } from "../error.js";

export class InvalidLibraryAddressError extends CustomError {
  constructor(formattedLibraries: string) {
    super(`The following libraries have invalid addresses:
${formattedLibraries}

Please provide valid Ethereum addresses for these libraries.`);
  }
}

export class AmbiguousLibraryNameError extends CustomError {
  constructor(formattedLibraries: string) {
    super(`The following libraries may resolve to multiple libraries:
${formattedLibraries}

Please provide the fully qualified name for these libraries.`);
  }
}

export class UnnecessaryLibraryError extends CustomError {
  constructor(formattedLibraries: string) {
    super(`The following libraries are not referenced by the contract:
${formattedLibraries}

Please provide only the libraries that are needed.`);
  }
}

export class OverlappingLibrariesError extends CustomError {
  constructor(formattedLibraries: string) {
    super(`The following libraries are provided more than once:
${formattedLibraries}

Please ensure that each library is provided only once, either by its name or its fully qualified name.`);
  }
}

export class MissingLibrariesError extends CustomError {
  constructor(formattedLibraries: string) {
    super(
      `The following libraries are missing:
${formattedLibraries}

Please provide all the required libraries.`,
    );
  }
}
