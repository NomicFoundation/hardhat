/**
 * A description of a kind of error that Hardhat can throw.
 */
export interface ErrorDescriptor {
  /**
   * The error number, which should be unique.
   */
  number: number;

  /**
   * The id of the plugin that throws this error.
   */
  pluginId?: string;

  /**
   * A tempalte of the message of the error.
   *
   * This should be a short description. If possible, it should tell the user
   * how to solve their problem.
   *
   * @see The `applyErrorMessageTemplate` function.
   */
  messageTemplate: string;

  /**
   * `true` if this error should be reported
   */
  shouldBeReported?: true;

  /**
   * The title to use on the website section explaining this error, which can
   * use markdown.
   */
  websiteTitle: string;

  /**
   * The description to use on the website section explaining this error, which
   * can use markdown.
   */
  websiteDescription: string;
}

export const ERROR_CATEGORIES: {
  [categoryName: string]: {
    min: number;
    max: number;
    websiteTitle: string;
  };
} = {
  GENERAL: { min: 1, max: 99, websiteTitle: "General errors" },
  INTERNAL: { min: 100, max: 199, websiteTitle: "Internal Hardhat errors" },
  TASK_DEFINITIONS: {
    min: 200,
    max: 299,
    websiteTitle: "Task definition errors",
  },
  ARGUMENTS: { min: 300, max: 399, websiteTitle: "Arguments related errors" },
  RESOLVER: {
    min: 400,
    max: 499,
    websiteTitle: "Dependencies resolution errors",
  },
  SOLC: { min: 500, max: 599, websiteTitle: "Solidity related errors" },
  BUILTIN_TASKS: { min: 600, max: 699, websiteTitle: "Built-in tasks errors" },
  ARTIFACTS: { min: 700, max: 799, websiteTitle: "Artifacts related errors" },
  SOURCE_NAMES: { min: 1000, max: 1099, websiteTitle: "Source name errors" },
  CONTRACT_NAMES: {
    min: 1100,
    max: 1199,
    websiteTitle: "Contract name errors",
  },
  PLUGINS: {
    min: 1200,
    max: 1299,
    websiteTitle: "Plugin errors",
  },
};

export const ERRORS = {
  GENERAL: {
    NOT_INSIDE_PROJECT: {
      number: 1,
      messageTemplate: "You are not inside a Hardhat project.",
      websiteTitle: "You are not inside a Hardhat project",
      websiteDescription: `You are trying to run Hardhat outside of a Hardhat project.

You can learn how to use Hardhat by reading the [Getting Started guide](/hardhat-runner/docs/getting-started).`,
    },
    CORRUPTED_LOCKFILE: {
      number: 2,
      messageTemplate: `You installed Hardhat with a corrupted lockfile due to the NPM bug #4828.

Please delete your node_modules, package-lock.json, reinstall your project, and try again.`,
      websiteTitle: "Corrupted lockfile",
      websiteDescription: `Some versions of NPM are affected [by a bug](https://github.com/npm/cli/issues/4828) that leads to corrupt lockfiles being generated.

This bug can only affect you if you, or someone at your team, installed the project without a lockfile, but with an existing node_modules.

To avoid it, please delete both your node_modules and package-lock.json, and reinstall your project.

Note that you don't need to do this every time you install a new dependency, but please make sure to delete your node_modules every time you delete your package-lock.json.`,
    },
    INVALID_READ_OF_DIRECTORY: {
      number: 3,
      messageTemplate:
        "Invalid file path {absolutePath}. Attempting to read a directory instead of a file.",
      websiteTitle: "Invalid read: a directory cannot be read",
      websiteDescription: `An attempt was made to read a file, but a path to a directory was provided.

Please double check the file path.`,
    },
    DUPLICATED_PLUGIN_ID: {
      number: 4,
      messageTemplate:
        'Duplicated plugin id "{id}" found. Did you install multiple versions of the same plugin?',
      websiteTitle: "Duplicated plugin id",
      websiteDescription: `While loading the plugins, two different plugins where found with the same id.

Please double check whether you have multiple versions of the same plugin installed.`,
    },
    NO_CONFIG_FILE_FOUND: {
      number: 5,
      messageTemplate: "No Hardhat config file found",
      websiteTitle: "No Hardhat config file found",
      websiteDescription:
        "Hardhat couldn't find a config file in the current directory or any of its parents.",
    },
    INVALID_CONFIG_PATH: {
      number: 6,
      messageTemplate: "Config file {configPath} not found",
      websiteTitle: "Invalid config path",
      websiteDescription: "The config file doesn't exist at the provided path.",
    },
    NO_CONFIG_EXPORTED: {
      number: 7,
      messageTemplate: "No config exported in {configPath}",
      websiteTitle: "No config exported",
      websiteDescription: "There is nothing exported from the config file.",
    },
    INVALID_CONFIG_OBJECT: {
      number: 8,
      messageTemplate: "Invalid config exported in {configPath}",
      websiteTitle: "Invalid config object",
      websiteDescription:
        "The config file doesn't export a valid configuration object.",
    },
  },
  INTERNAL: {
    ASSERTION_ERROR: {
      number: 100,
      messageTemplate: "An internal invariant was violated: {message}",
      websiteTitle: "Invariant violation",
      websiteDescription: `An internal invariant was violated. This is probably caused by a programming error in Hardhat or in one of the used plugins.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.`,
      shouldBeReported: true,
    },
  },
  TASK_DEFINITIONS: {
    DEPRECATED_TRANSFORM_IMPORT_TASK: {
      number: 200,
      websiteTitle: "Use of deprecated remapping task",
      messageTemplate:
        "Task TASK_COMPILE_TRANSFORM_IMPORT_NAME is deprecated. Please update your @nomicfoundation/hardhat-foundry plugin version.",
      websiteDescription: `This task has been deprecated in favor of a new approach.`,
      shouldBeReported: true,
    },
    INVALID_FILE_ACTION: {
      number: 201,
      messageTemplate: "Invalid file action: {action} is not a valid file URL",
      websiteTitle: "Invalid file action",
      websiteDescription: `The setAction function was called with a string parameter that is not a valid file URL. A valid file URL must start with 'file://'.

Please ensure that you are providing a correct file URL.`,
    },
    NO_ACTION: {
      number: 202,
      messageTemplate: "The task {task} doesn't have an action",
      websiteTitle: "Task missing action",
      websiteDescription: `A task was defined without an action.

Please ensure that an action is defined for each task.`,
    },
    POSITIONAL_PARAM_AFTER_VARIADIC: {
      number: 203,
      messageTemplate:
        "Cannot add the positional param {name} after a variadic one",
      websiteTitle: "Invalid task definition",
      websiteDescription:
        "A variadic parameter must always be the last positional parameter in a task definition.",
    },
    REQUIRED_PARAM_AFTER_OPTIONAL: {
      number: 204,
      messageTemplate:
        "Cannot add required positional param {name} after an optional one",
      websiteTitle: "Invalid task definition",
      websiteDescription:
        "Required positional parameters must be defined before optional ones in a task definition.",
    },
    TASK_NOT_FOUND: {
      number: 205,
      messageTemplate: "Task {task} not found",
      websiteTitle: "Task not found",
      websiteDescription: "The provided task name does not match any task.",
    },
    SUBTASK_WITHOUT_PARENT: {
      number: 206,
      messageTemplate:
        "Task {task} not found when attempting to define subtask {subtask}. If you intend to only define subtasks, please first define {task} as an empty task",
      websiteTitle: "Subtask without parent",
      websiteDescription:
        "The parent task of the subtask being defined was not found. If you intend to only define subtasks, please first define the parent task as an empty task.",
    },
    TASK_ALREADY_DEFINED: {
      number: 207,
      messageTemplate:
        "{actorFragment} trying to define the task {task} but it is already defined{definedByFragment}",
      websiteTitle: "Task already defined",
      websiteDescription:
        "The task is already defined. Please ensure that tasks are uniquely named to avoid conflicts.",
    },
    EMPTY_TASK_ID: {
      number: 208,
      messageTemplate: "Task id cannot be an empty string or an empty array",
      websiteTitle: "Empty task id",
      websiteDescription:
        "The task id cannot be an empty string or an empty array. Please ensure that the array of task names is not empty.",
    },
    TASK_PARAMETER_ALREADY_DEFINED: {
      number: 209,
      messageTemplate:
        "{actorFragment} trying to define task {task} with the named parameter {namedParamName} but it is already defined as a global parameter by plugin {globalParamPluginId}",
      websiteTitle: "Task parameter already defined",
      websiteDescription:
        "The task named parameter is already defined as a global parameter by another plugin. Please ensure that task parameters are uniquely named to avoid conflicts.",
    },
    TASK_OVERRIDE_PARAMETER_ALREADY_DEFINED: {
      number: 210,
      messageTemplate:
        "{actorFragment} trying to override the parameter {namedParamName} of the task {task} but it is already defined",
      websiteTitle: "Task override parameter already defined",
      websiteDescription:
        "An attempt is being made to override a parameter that has already been defined. Please ensure that the parameter is not defined before trying to override it.",
    },
  },
  ARGUMENTS: {
    INVALID_VALUE_FOR_TYPE: {
      number: 300,
      messageTemplate:
        "Invalid value {value} for argument {name} of type {type}",
      websiteTitle: "Invalid argument type",
      websiteDescription: `One of your Hardhat or task arguments has an invalid type.

Please double check your arguments.`,
    },
    RESERVED_NAME: {
      number: 301,
      messageTemplate: "Argument name {name} is reserved",
      websiteTitle: "Reserved argument name",
      websiteDescription: `One of your Hardhat or task arguments has a reserved name.

Please double check your arguments.`,
    },
    DUPLICATED_NAME: {
      number: 302,
      messageTemplate: "Argument name {name} is already in use",
      websiteTitle: "Argument name already in use",
      websiteDescription: `One of your Hardhat or task argument names is already in use.

Please double check your arguments.`,
    },
    INVALID_NAME: {
      number: 303,
      messageTemplate: "Argument name {name} is invalid",
      websiteTitle: "Invalid argument name",
      websiteDescription: `One of your Hardhat or task argument names is invalid.

Please double check your arguments.`,
    },
    UNRECOGNIZED_NAMED_PARAM: {
      number: 304,
      messageTemplate:
        "Invalid parameter {parameter}. It is neither a valid global parameter nor associated with any task. Did you forget to add the task first, or did you misspell it?",
      websiteTitle: "Invalid parameter value",
      websiteDescription: `One of your Hardhat parameters is invalid.

Please double check your arguments.`,
    },
    MISSING_VALUE_FOR_NAMED_PARAMETER: {
      number: 305,
      messageTemplate: "Missing value for the task parameter named {paramName}",
      websiteTitle: "Missing value for the task parameter",
      websiteDescription: `You tried to run a task, but one of the values of its parameters was missing.

Please double check how you invoked Hardhat or ran your task.`,
    },
    UNUSED_ARGUMENT: {
      number: 306,
      messageTemplate:
        "The argument with value {value} was not consumed because it is not associated with any task.",
      websiteTitle: "Argument was not consumed",
      websiteDescription: `You tried to run a task, but one of your arguments was not consumed.

Please double check how you invoked Hardhat or ran your task.`,
    },
  },
  RESOLVER: {
    FILE_NOT_FOUND: {
      number: 400,
      messageTemplate: "File {file} doesn't exist.",
      websiteTitle: "Solidity file not found",
      websiteDescription: `Tried to resolve a nonexistent Solidity file as an entry-point.`,
    },
    LIBRARY_NOT_INSTALLED: {
      number: 401,
      messageTemplate: "Library {library} is not installed.",
      websiteTitle: "Solidity library not installed",
      websiteDescription: `One of your Solidity sources imports a library that is not installed.

Please double check your imports or install the missing dependency.`,
    },
    LIBRARY_FILE_NOT_FOUND: {
      number: 402,
      messageTemplate: "File {file} doesn't exist.",
      websiteTitle: "Missing library file",
      websiteDescription: `One of your libraries' files was imported but doesn't exist.

Please double check your imports or update your libraries.`,
    },
    ILLEGAL_IMPORT: {
      number: 403,
      messageTemplate: "Illegal import {imported} from {from}",
      websiteTitle: "Illegal Solidity import",
      websiteDescription: `One of your libraries tried to use a relative import to import a file outside of its scope.

This is disabled for security reasons.`,
    },
    IMPORTED_FILE_NOT_FOUND: {
      number: 404,
      messageTemplate: "File {imported}, imported from {from}, not found.",
      websiteTitle: "Imported file not found",
      websiteDescription: `One of your source files imported a nonexistent file.

Please double check your imports.`,
    },
    INVALID_IMPORT_BACKSLASH: {
      number: 405,
      messageTemplate:
        "Invalid import {imported} from {from}. Imports must use / instead of \\, even in Windows",
      websiteTitle: "Invalid import: use / instead of \\",
      websiteDescription: `A Solidity file is trying to import another file via relative path and is using backslashes (\\\\) instead of slashes (/).

You must always use slashes (/) in Solidity imports.`,
    },
    INVALID_IMPORT_PROTOCOL: {
      number: 406,
      messageTemplate:
        "Invalid import {imported} from {from}. Hardhat doesn't support imports via {protocol}.",
      websiteTitle: "Invalid import: trying to use an unsupported protocol",
      websiteDescription: `A Solidity file is trying to import a file using an unsupported protocol, like http.

You can only import files that are available locally or installed through npm.`,
    },
    INVALID_IMPORT_ABSOLUTE_PATH: {
      number: 407,
      messageTemplate:
        "Invalid import {imported} from {from}. Hardhat doesn't support imports with absolute paths.",
      websiteTitle: "Invalid import: absolute paths unsupported",
      websiteDescription: `A Solidity file is trying to import a file using its absolute path.

This is not supported, as it would lead to hard-to-reproduce compilations.`,
    },
    INVALID_IMPORT_OUTSIDE_OF_PROJECT: {
      number: 408,
      messageTemplate:
        "Invalid import {imported} from {from}. The file being imported is outside of the project",
      websiteTitle: "Invalid import: file outside of the project",
      websiteDescription: `A Solidity file is trying to import a file that is outside of the project.

This is not supported by Hardhat.`,
    },
    INVALID_IMPORT_WRONG_CASING: {
      number: 409,
      messageTemplate:
        "Trying to import {imported} from {from}, but it has an incorrect casing.",
      websiteTitle: "Invalid import: wrong file casing",
      websiteDescription: `A Solidity file is trying to import a file but its source name casing was wrong.

Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.`,
    },
    WRONG_SOURCE_NAME_CASING: {
      number: 410,
      messageTemplate:
        "Trying to resolve the file {incorrect} but its correct case-sensitive name is {correct}",
      websiteTitle: "Incorrect source name casing",
      websiteDescription: `You tried to resolve a Solidity file with an incorrect casing.

Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.`,
    },
    IMPORTED_LIBRARY_NOT_INSTALLED: {
      number: 411,
      messageTemplate:
        "The library {library}, imported from {from}, is not installed. Try installing it using npm.",
      websiteTitle: "Invalid import: library not installed",
      websiteDescription: `A Solidity file is trying to import another which belongs to a library that is not installed.

Try installing the library using npm.`,
    },
    INCLUDES_OWN_PACKAGE_NAME: {
      number: 412,
      messageTemplate:
        "Invalid import {imported} from {from}. Trying to import file using the own package's name.",
      websiteTitle: "Invalid import: includes own package's name",
      websiteDescription: `A Solidity file is trying to import another using its own package name. This is most likely caused by an existing symlink for the package in your node_modules.

Use a relative import instead of referencing the package's name.`,
    },
    IMPORTED_MAPPED_FILE_NOT_FOUND: {
      number: 413,
      messageTemplate:
        "File {importName} => {imported}, imported from {from}, not found.",
      websiteTitle: "Imported mapped file not found",
      websiteDescription: `One of your source files imported a nonexistent or not installed file.

Please double check your imports and installed libraries.`,
    },
    INVALID_IMPORT_OF_DIRECTORY: {
      number: 414,
      messageTemplate:
        "Invalid import {imported} from {from}. Attempting to import a directory. Directories cannot be imported.",
      websiteTitle: "Invalid import: a directory cannot be imported",
      websiteDescription: `A Solidity file is attempting to import a directory, which is not possible.

Please double check your imports.`,
    },
    AMBIGUOUS_SOURCE_NAMES: {
      number: 415,
      messageTemplate:
        "Two different source names ({sourcenames}) resolve to the same file ({file}).",
      websiteTitle: "Ambiguous source names",
      websiteDescription: `Two different source names map to the same file.

This is probably caused by multiple remappings pointing to the same source file.`,
    },
  },
  SOLC: {
    INVALID_VERSION: {
      number: 500,
      messageTemplate: `Solidity version {version} is invalid or hasn't been released yet.

If you are certain it has been released, run "npx hardhat clean --global" and try again`,
      websiteTitle: "Invalid or unreleased `solc` version",
      websiteDescription: `The Solidity version in your config is invalid or hasn't been released yet.

If you are certain it has been released, run \`npx hardhat clean --global\` and try again.`,
    },
    DOWNLOAD_FAILED: {
      number: 501,
      messageTemplate:
        "Couldn't download compiler version {remoteVersion}. Please check your internet connection and try again.",
      websiteTitle: "`solc` download failed",
      websiteDescription: `Couldn't download \`solc\`.

Please check your internet connection and try again.`,
    },
    VERSION_LIST_DOWNLOAD_FAILED: {
      number: 502,
      messageTemplate:
        "Couldn't download compiler version list. Please check your internet connection and try again.",
      websiteTitle: "Couldn't obtain `solc` version list",
      websiteDescription: `Couldn't download \`solc\`'s version list.

Please check your internet connection and try again.`,
    },
    INVALID_DOWNLOAD: {
      number: 503,
      messageTemplate: `Couldn't download compiler version {remoteVersion}: Checksum verification failed.

Please check your internet connection and try again.

If this error persists, run "npx hardhat clean --global".`,
      websiteTitle: "Downloaded `solc` checksum verification failed",
      websiteDescription: `Hardhat downloaded a version of the Solidity compiler, and its checksum verification failed.

Please check your internet connection and try again.

If this error persists, run \`npx hardhat clean --global\`.`,
    },
    CANT_RUN_NATIVE_COMPILER: {
      number: 504,
      messageTemplate: `A native version of solc failed to run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
      websiteTitle: "Failed to run native solc",
      websiteDescription: `Hardhat successfully downloaded a native version of solc but it doesn't run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
    },
  },
  BUILTIN_TASKS: {
    COMPILE_FAILURE: {
      number: 600,
      messageTemplate: "Compilation failed",
      websiteTitle: "Compilation failed",
      websiteDescription: `Your smart contracts failed to compile.

Please check Hardhat's output for more details.`,
    },
    COMPILATION_JOBS_CREATION_FAILURE: {
      number: 601,
      messageTemplate: `The project cannot be compiled, see reasons below.

{reasons}`,
      websiteTitle: "The project cannot be compiled",
      websiteDescription: `The project cannot be compiled with the current settings.`,
    },
    COMPILE_TASK_UNSUPPORTED_SOLC_VERSION: {
      number: 602,
      messageTemplate: `Version {version} is not supported by Hardhat.

The first supported version is {firstSupportedVersion}`,
      websiteTitle: "Unsupported solc version",
      websiteDescription: `This version of solidity is not supported by Hardhat.
Please use a newer, supported version.`,
      shouldBeReported: true,
    },
  },
  ARTIFACTS: {
    NOT_FOUND: {
      number: 700,
      messageTemplate:
        'Artifact for contract "{contractName}" not found. {suggestion}',
      websiteTitle: "Artifact not found",
      websiteDescription: `Tried to import a nonexistent artifact.

Please double check that your contracts have been compiled and double check your artifact's name.`,
    },
    MULTIPLE_FOUND: {
      number: 701,
      messageTemplate: `There are multiple artifacts for contract "{contractName}", please use a fully qualified name.

Please replace {contractName} for one of these options wherever you are trying to read its artifact:

{candidates}
`,
      websiteTitle: "Multiple artifacts found",
      websiteDescription: `There are multiple artifacts that match the given contract name, and Hardhat doesn't know which one to use.

Please use the fully qualified name of the contract to disambiguate it.`,
    },
    WRONG_CASING: {
      number: 702,
      messageTemplate:
        "Invalid artifact path {incorrect}, its correct case-sensitive path is {correct}",
      websiteTitle: "Incorrect artifact path casing",
      websiteDescription: `You tried to get an artifact file with an incorrect casing.

Hardhat's artifact resolution is case sensitive to ensure projects are portable across different operating systems.`,
      shouldBeReported: true,
    },
  },
  SOURCE_NAMES: {
    INVALID_SOURCE_NAME_ABSOLUTE_PATH: {
      number: 1000,
      messageTemplate:
        "Invalid source name {name}. Expected source name but found an absolute path.",
      websiteTitle: "Invalid source name: absolute path",
      websiteDescription: `A Solidity source name was expected, but an absolute path was given.

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    INVALID_SOURCE_NAME_RELATIVE_PATH: {
      number: 1001,
      messageTemplate:
        "Invalid source name {name}. Expected source name but found a relative path.",
      websiteTitle: "Invalid source name: relative path",
      websiteDescription: `A Solidity source name was expected, but a relative path was given.

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    INVALID_SOURCE_NAME_BACKSLASHES: {
      number: 1002,
      messageTemplate:
        "Invalid source {name}. The source name uses backslashes (\\) instead of slashes (/).",
      websiteTitle: "Invalid source name: backslashes",
      websiteDescription: `A Solidity source name was invalid because it uses backslashes (\\\\) instead of slashes (/).

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    INVALID_SOURCE_NOT_NORMALIZED: {
      number: 1003,
      messageTemplate:
        "Invalid source name {name}. Source names must be normalized",
      websiteTitle: "Invalid source name: not normalized",
      websiteDescription: `A Solidity source name was invalid because it wasn't normalized. It probably contains some "." or "..".

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    WRONG_CASING: {
      number: 1004,
      messageTemplate:
        "Invalid source map {incorrect}, its correct case-sensitive source name is {correct}",
      websiteTitle: "Incorrect source name casing",
      websiteDescription: `You tried to resolve a Solidity file with an incorrect casing.

Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.`,
      shouldBeReported: true,
    },
    FILE_NOT_FOUND: {
      number: 1005,
      messageTemplate: "Solidity source file {name} not found",
      websiteTitle: "Solidity source file not found",
      websiteDescription: `A source name should correspond to an existing Solidity file but it doesn't.

Hardhat's compiler is case sensitive to ensure projects are portable across different operating systems.`,
      shouldBeReported: true,
    },
    NODE_MODULES_AS_LOCAL: {
      number: 1006,
      messageTemplate:
        "The file {path} is treated as local but is inside a node_modules directory",
      websiteTitle: "File from node_modules treated as local",
      websiteDescription: `A file was treated as local but is inside a node_modules directory.

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
    EXTERNAL_AS_LOCAL: {
      number: 1007,
      messageTemplate:
        "The file {path} is treated as local but is outside the project",
      websiteTitle: "File from outside the project treated as local",
      websiteDescription: `A file was treated as local but is outside the project.

If you aren't overriding compilation-related tasks, please report this as a bug.`,
      shouldBeReported: true,
    },
  },
  CONTRACT_NAMES: {
    INVALID_FULLY_QUALIFIED_NAME: {
      number: 1100,
      messageTemplate: "Invalid fully qualified contract name {name}.",
      websiteTitle: "Invalid fully qualified contract name",
      websiteDescription: `A contract name was expected to be in fully qualified form, but it's not.

A fully qualified name should look like file.sol:Contract`,
    },
  },
  PLUGINS: {
    PLUGIN_NOT_INSTALLED: {
      number: 1200,
      messageTemplate: 'Plugin "{pluginId}" is not installed.',
      websiteTitle: "Plugin not installed",
      websiteDescription: `A plugin was included in the Hardhat config but has not been installed.`,
    },
    PLUGIN_MISSING_DEPENDENCY: {
      number: 1201,
      messageTemplate:
        'Plugin "{pluginId}" is missing a peer dependency "{peerDependencyName}".',
      websiteTitle: "Plugin missing peer dependency",
      websiteDescription: `A plugin's peer dependency has not been installed.`,
    },
    DEPENDENCY_VERSION_MISMATCH: {
      number: 1202,
      messageTemplate:
        'Plugin "{pluginId}" has a peer dependency "{peerDependencyName}" with version "{installedVersion}" but version "{expectedVersion}" is needed.',
      websiteTitle: "Dependency version mismatch",
      websiteDescription: `A plugin's peer dependency version does not match the expected version.`,
    },
    PLUGIN_DEPENDENCY_FAILED_LOAD: {
      number: 1203,
      messageTemplate: 'Plugin "{pluginId}" dependency could not be loaded.',
      websiteTitle: "Plugin dependency could not be loaded",
      websiteDescription: `A plugin's dependent plugin could not be lazily loaded.`,
    },
  },
} as const;
