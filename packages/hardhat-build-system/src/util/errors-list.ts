export const ERROR_PREFIX = "HH";

export interface ErrorDescriptor {
  number: number;
  // Message can use templates. See applyErrorMessageTemplate
  message: string;
  // Title and description can be Markdown
  title: string;
  description: string;
  shouldBeReported: boolean;
}

export function getErrorCode(error: ErrorDescriptor): string {
  return `${ERROR_PREFIX}${error.number}`;
}

export const ERROR_RANGES: {
  [category in keyof typeof ERRORS]: {
    min: number;
    max: number;
    title: string;
  };
} = {
  GENERAL: { min: 1, max: 99, title: "General errors" },
  // NETWORK: { min: 100, max: 199, title: "Network related errors" },
  TASK_DEFINITIONS: {
    min: 200,
    max: 299,
    title: "Task definition errors",
  },
  ARGUMENTS: { min: 300, max: 399, title: "Arguments related errors" },
  RESOLVER: {
    min: 400,
    max: 499,
    title: "Dependencies resolution errors",
  },
  SOLC: { min: 500, max: 599, title: "Solidity related errors" },
  BUILTIN_TASKS: { min: 600, max: 699, title: "Built-in tasks errors" },
  ARTIFACTS: { min: 700, max: 799, title: "Artifacts related errors" },
  // PLUGINS: { min: 800, max: 899, title: "Plugin system errors" },
  INTERNAL: { min: 900, max: 999, title: "Internal Hardhat errors" },
  SOURCE_NAMES: { min: 1000, max: 1099, title: "Source name errors" },
  CONTRACT_NAMES: { min: 1100, max: 1199, title: "Contract name errors" },
  // VARS: { min: 1200, max: 1299, title: "Connfiguration variables errors" },
};

export const ERRORS = {
  GENERAL: {
    ASSERTION_ERROR: {
      number: 11,
      message: "An internal invariant was violated: %message%",
      title: "Invariant violation",
      description: `An internal invariant was violated.
This is probably caused by a programming error in hardhat or in one of the used plugins.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.`,
      shouldBeReported: true,
    },
    CORRUPTED_LOCKFILE: {
      number: 18,
      message: `You installed Hardhat with a corrupted lockfile due to the NPM bug #4828.

Please delete your node_modules, package-lock.json, reinstall your project, and try again.`,
      title: "Corrupted lockfile",
      description: `Some versions of NPM are affected [by a bug](https://github.com/npm/cli/issues/4828) that leads to corrupt lockfiles being generated.

This bug can only affect you if you, or someone at your team, installed the project without a lockfile, but with an existing node_modules.

To avoid it, please delete both your node_modules and package-lock.json, and reinstall your project.

Note that you don't need to do this every time you install a new dependency, but please make sure to delete your node_modules every time you delete your package-lock.json.`,
      shouldBeReported: false,
    },
    INVALID_READ_OF_DIRECTORY: {
      number: 22,
      message:
        "Invalid file path %absolutePath%. Attempting to read a directory instead of a file.",
      title: "Invalid read: a directory cannot be read",
      description: `An attempt was made to read a file, but a path to a directory was provided.

Please double check the file path.`,
      shouldBeReported: false,
    },
  },
  TASK_DEFINITIONS: {
    DEPRECATED_TRANSFORM_IMPORT_TASK: {
      number: 215,
      title: "Use of deprecated remapping task",
      message:
        "Task TASK_COMPILE_TRANSFORM_IMPORT_NAME is deprecated. Please update your @nomicfoundation/hardhat-foundry plugin version.",
      description: `This task has been deprecated in favor of a new approach.`,
      shouldBeReported: true,
    },
  },
  ARGUMENTS: {
    INVALID_VALUE_FOR_TYPE: {
      number: 301,
      message: "Invalid value %value% for argument %name% of type %type%",
      title: "Invalid argument type",
      description: `One of your Hardhat or task arguments has an invalid type.

Please double check your arguments.`,
      shouldBeReported: false,
    },
  },
  RESOLVER: {
    FILE_NOT_FOUND: {
      number: 400,
      message: "File %file% doesn't exist.",
      title: "Solidity file not found",
      description: `Tried to resolve a nonexistent Solidity file as an entry-point.`,
      shouldBeReported: false,
    },
    LIBRARY_NOT_INSTALLED: {
      number: 401,
      message: "Library %library% is not installed.",
      title: "Solidity library not installed",
      description: `One of your Solidity sources imports a library that is not installed.

Please double check your imports or install the missing dependency.`,
      shouldBeReported: false,
    },
    LIBRARY_FILE_NOT_FOUND: {
      number: 402,
      message: "File %file% doesn't exist.",
      title: "Missing library file",
      description: `One of your libraries' files was imported but doesn't exist.

Please double check your imports or update your libraries.`,
      shouldBeReported: false,
    },
    ILLEGAL_IMPORT: {
      number: 403,
      message: "Illegal import %imported% from %from%",
      title: "Illegal Solidity import",
      description: `One of your libraries tried to use a relative import to import a file outside of its scope.

This is disabled for security reasons.`,
      shouldBeReported: false,
    },
    IMPORTED_FILE_NOT_FOUND: {
      number: 404,
      message: "File %imported%, imported from %from%, not found.",
      title: "Imported file not found",
      description: `One of your source files imported a nonexistent file.

Please double check your imports.`,
      shouldBeReported: false,
    },
    INVALID_IMPORT_BACKSLASH: {
      number: 405,
      message:
        "Invalid import %imported% from %from%. Imports must use / instead of \\, even in Windows",
      title: "Invalid import: use / instead of \\",
      description: `A Solidity file is trying to import another file via relative path and is using backslashes (\\\\) instead of slashes (/).

You must always use slashes (/) in Solidity imports.`,
      shouldBeReported: false,
    },
    INVALID_IMPORT_PROTOCOL: {
      number: 406,
      message:
        "Invalid import %imported% from %from%. Hardhat doesn't support imports via %protocol%.",
      title: "Invalid import: trying to use an unsupported protocol",
      description: `A Solidity file is trying to import a file using an unsupported protocol, like http.

You can only import files that are available locally or installed through npm.`,
      shouldBeReported: false,
    },
    INVALID_IMPORT_ABSOLUTE_PATH: {
      number: 407,
      message:
        "Invalid import %imported% from %from%. Hardhat doesn't support imports with absolute paths.",
      title: "Invalid import: absolute paths unsupported",
      description: `A Solidity file is trying to import a file using its absolute path.

This is not supported, as it would lead to hard-to-reproduce compilations.`,
      shouldBeReported: false,
    },
    INVALID_IMPORT_OUTSIDE_OF_PROJECT: {
      number: 408,
      message:
        "Invalid import %imported% from %from%. The file being imported is outside of the project",
      title: "Invalid import: file outside of the project",
      description: `A Solidity file is trying to import a file that is outside of the project.

This is not supported by Hardhat.`,
      shouldBeReported: false,
    },
    INVALID_IMPORT_WRONG_CASING: {
      number: 409,
      message:
        "Trying to import %imported% from %from%, but it has an incorrect casing.",
      title: "Invalid import: wrong file casing",
      description: `A Solidity file is trying to import a file but its source name casing was wrong.

Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.`,
      shouldBeReported: false,
    },
    WRONG_SOURCE_NAME_CASING: {
      number: 410,
      message:
        "Trying to resolve the file %incorrect% but its correct case-sensitive name is %correct%",
      title: "Incorrect source name casing",
      description: `You tried to resolve a Solidity file with an incorrect casing.

Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.`,
      shouldBeReported: false,
    },
    IMPORTED_LIBRARY_NOT_INSTALLED: {
      number: 411,
      message:
        "The library %library%, imported from %from%, is not installed. Try installing it using npm.",
      title: "Invalid import: library not installed",
      description: `A Solidity file is trying to import another which belongs to a library that is not installed.

Try installing the library using npm.`,
      shouldBeReported: false,
    },
    INCLUDES_OWN_PACKAGE_NAME: {
      number: 412,
      message:
        "Invalid import %imported% from %from%. Trying to import file using the own package's name.",
      title: "Invalid import: includes own package's name",
      description: `A Solidity file is trying to import another using its own package name. This is most likely caused by an existing symlink for the package in your node_modules.

Use a relative import instead of referencing the package's name.`,
      shouldBeReported: false,
    },
    IMPORTED_MAPPED_FILE_NOT_FOUND: {
      number: 413,
      message:
        "File %importName% => %imported%, imported from %from%, not found.",
      title: "Imported mapped file not found",
      description: `One of your source files imported a nonexistent or not installed file.

Please double check your imports and installed libraries.`,
      shouldBeReported: false,
    },
    INVALID_IMPORT_OF_DIRECTORY: {
      number: 414,
      message:
        "Invalid import %imported% from %from%. Attempting to import a directory. Directories cannot be imported.",
      title: "Invalid import: a directory cannot be imported",
      description: `A Solidity file is attempting to import a directory, which is not possible.

Please double check your imports.`,
      shouldBeReported: false,
    },
    AMBIGUOUS_SOURCE_NAMES: {
      number: 415,
      message:
        "Two different source names (%sourcenames%) resolve to the same file (%file%).",
      title: "Ambiguous source names",
      description: `Two different source names map to the same file.

This is probably caused by multiple remappings pointing to the same source file.`,
      shouldBeReported: false,
    },
  },
  SOLC: {
    INVALID_VERSION: {
      number: 500,
      message: `Solidity version %version% is invalid or hasn't been released yet.

If you are certain it has been released, run "npx hardhat clean --global" and try again`,
      title: "Invalid or unreleased `solc` version",
      description: `The Solidity version in your config is invalid or hasn't been released yet.

If you are certain it has been released, run \`npx hardhat clean --global\` and try again.`,
      shouldBeReported: false,
    },
    DOWNLOAD_FAILED: {
      number: 501,
      message:
        "Couldn't download compiler version %remoteVersion%. Please check your internet connection and try again.",
      title: "`solc` download failed",
      description: `Couldn't download \`solc\`.

Please check your internet connection and try again.`,
      shouldBeReported: false,
    },
    VERSION_LIST_DOWNLOAD_FAILED: {
      number: 502,
      message:
        "Couldn't download compiler version list. Please check your internet connection and try again.",
      title: "Couldn't obtain `solc` version list",
      description: `Couldn't download \`solc\`'s version list.

Please check your internet connection and try again.`,
      shouldBeReported: false,
    },
    INVALID_DOWNLOAD: {
      number: 503,
      message: `Couldn't download compiler version %remoteVersion%: Checksum verification failed.

Please check your internet connection and try again.

If this error persists, run "npx hardhat clean --global".`,
      title: "Downloaded `solc` checksum verification failed",
      description: `Hardhat downloaded a version of the Solidity compiler, and its checksum verification failed.

Please check your internet connection and try again.

If this error persists, run \`npx hardhat clean --global\`.`,
      shouldBeReported: false,
    },
    CANT_RUN_NATIVE_COMPILER: {
      number: 505,
      message: `A native version of solc failed to run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
      title: "Failed to run native solc",
      description: `Hardhat successfully downloaded a native version of solc but it doesn't run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
      shouldBeReported: false,
    },
  },
  BUILTIN_TASKS: {
    COMPILE_FAILURE: {
      number: 600,
      message: "Compilation failed",
      title: "Compilation failed",
      description: `Your smart contracts failed to compile.

Please check Hardhat's output for more details.`,
      shouldBeReported: false,
    },
    COMPILATION_JOBS_CREATION_FAILURE: {
      number: 606,
      message: `The project cannot be compiled, see reasons below.

%reasons%`,
      title: "The project cannot be compiled",
      description: `The project cannot be compiled with the current settings.`,
      shouldBeReported: false,
    },
    COMPILE_TASK_UNSUPPORTED_SOLC_VERSION: {
      number: 608,
      message: `Version %version% is not supported by Hardhat.

The first supported version is %firstSupportedVersion%`,
      title: "Unsupported solc version",
      description: `This version of solidity is not supported by Hardhat.
Please use a newer, supported version.`,
      shouldBeReported: true,
    },
  },
  ARTIFACTS: {
    NOT_FOUND: {
      number: 700,
      message: 'Artifact for contract "%contractName%" not found. %suggestion%',
      title: "Artifact not found",
      description: `Tried to import a nonexistent artifact.

Please double check that your contracts have been compiled and double check your artifact's name.`,
      shouldBeReported: false,
    },
    MULTIPLE_FOUND: {
      number: 701,
      message: `There are multiple artifacts for contract "%contractName%", please use a fully qualified name.

Please replace %contractName% for one of these options wherever you are trying to read its artifact:

%candidates%
`,
      title: "Multiple artifacts found",
      description: `There are multiple artifacts that match the given contract name, and Hardhat doesn't know which one to use.

Please use the fully qualified name of the contract to disambiguate it.`,
      shouldBeReported: false,
    },
    WRONG_CASING: {
      number: 702,
      message:
        "Invalid artifact path %incorrect%, its correct case-sensitive path is %correct%",
      title: "Incorrect artifact path casing",
      description: `You tried to get an artifact file with an incorrect casing.

Hardhat's artifact resolution is case sensitive to ensure projects are portable across different operating systems.`,
      shouldBeReported: true,
    },
  },
  INTERNAL: {
    TEMPLATE_INVALID_VARIABLE_NAME: {
      number: 900,
      message:
        "Variable names can only include ascii letters and numbers, and start with a letter, but got %variable%",
      title: "Invalid error message template",
      description: `An error message template contains an invalid variable name. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.`,
      shouldBeReported: true,
    },
    TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG: {
      number: 901,
      message:
        "Template values can't include variable tags, but %variable%'s value includes one",
      title: "Invalid error message replacement",
      description: `Tried to replace an error message variable with a value that contains another variable name. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.`,
      shouldBeReported: true,
    },
    TEMPLATE_VARIABLE_TAG_MISSING: {
      number: 902,
      message: "Variable %variable%'s tag not present in the template",
      title: "Missing replacement value from error message template",
      description: `An error message template is missing a replacement value. This is a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.`,
      shouldBeReported: true,
    },
  },
  SOURCE_NAMES: {
    INVALID_SOURCE_NAME_ABSOLUTE_PATH: {
      number: 1000,
      message:
        "Invalid source name %name%. Expected source name but found an absolute path.",
      title: "Invalid source name: absolute path",
      description: `A Solidity source name was expected, but an absolute path was given.

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    INVALID_SOURCE_NAME_RELATIVE_PATH: {
      number: 1001,
      message:
        "Invalid source name %name%. Expected source name but found a relative path.",
      title: "Invalid source name: relative path",
      description: `A Solidity source name was expected, but a relative path was given.

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    INVALID_SOURCE_NAME_BACKSLASHES: {
      number: 1002,
      message:
        "Invalid source %name%. The source name uses backslashes (\\) instead of slashes (/).",
      title: "Invalid source name: backslashes",
      description: `A Solidity source name was invalid because it uses backslashes (\\\\) instead of slashes (/).

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    INVALID_SOURCE_NOT_NORMALIZED: {
      number: 1003,
      message: "Invalid source name %name%. Source names must be normalized",
      title: "Invalid source name: not normalized",
      description: `A Solidity source name was invalid because it wasn't normalized. It probably contains some "." or "..".

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    WRONG_CASING: {
      number: 1004,
      message:
        "Invalid source map %incorrect%, its correct case-sensitive source name is %correct%",
      title: "Incorrect source name casing",
      description: `You tried to resolve a Solidity file with an incorrect casing.

Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.`,
      shouldBeReported: true,
    },
    FILE_NOT_FOUND: {
      number: 1005,
      message: "Solidity source file %name% not found",
      title: "Solidity source file not found",
      description: `A source name should correspond to an existing Solidity file but it doesn't.

Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.`,
      shouldBeReported: true,
    },
    NODE_MODULES_AS_LOCAL: {
      number: 1006,
      message:
        "The file %path% is treated as local but is inside a node_modules directory",
      title: "File from node_modules treated as local",
      description: `A file was treated as local but is inside a node_modules directory.

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    EXTERNAL_AS_LOCAL: {
      number: 1007,
      message: "The file %path% is treated as local but is outside the project",
      title: "File from outside the project treated as local",
      description: `A file was treated as local but is outside the project.

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
  },
  CONTRACT_NAMES: {
    INVALID_FULLY_QUALIFIED_NAME: {
      number: 1100,
      message: "Invalid fully qualified contract name %name%.",
      title: "Invalid fully qualified contract name",
      description: `A contract name was expected to be in fully qualified form, but it's not.

A fully qualified name should look like file.sol:Contract`,
      shouldBeReported: false,
    },
  },
};
