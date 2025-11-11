/**
 * A description of a kind of error that Hardhat can throw.
 */
export interface ErrorDescriptor {
  /**
   * The error number, which should be unique.
   */
  number: number;

  /**
   * A template of the message of the error.
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
  [packageName: string]: {
    min: number;
    max: number;
    pluginId: string | undefined;
    websiteTitle: string;
    CATEGORIES: {
      [categoryName: string]: {
        min: number;
        max: number;
        websiteSubTitle: string;
      };
    };
  };
} = {
  CORE: {
    min: 1,
    max: 9999,
    pluginId: undefined,
    websiteTitle: "Hardhat 3",
    CATEGORIES: {
      GENERAL: {
        min: 1,
        max: 99,
        websiteSubTitle: "General errors",
      },
      INTERNAL: {
        min: 100,
        max: 199,
        websiteSubTitle: "Internal errors",
      },
      PLUGINS: {
        min: 200,
        max: 299,
        websiteSubTitle: "Plugin errors",
      },
      HOOKS: {
        min: 300,
        max: 399,
        websiteSubTitle: "Hooks errors",
      },
      TASK_DEFINITIONS: {
        min: 400,
        max: 499,
        websiteSubTitle: "Task definition errors",
      },
      ARGUMENTS: {
        min: 500,
        max: 599,
        websiteSubTitle: "Arguments related errors",
      },
      BUILTIN_TASKS: {
        min: 600,
        max: 699,
        websiteSubTitle: "Built-in tasks errors",
      },
      NETWORK: {
        min: 700,
        max: 799,
        websiteSubTitle: "Network errors",
      },
      SOLIDITY_TESTS: {
        min: 800,
        max: 899,
        websiteSubTitle: "Solidity tests errors",
      },
      SOLIDITY: {
        min: 900,
        max: 999,
        websiteSubTitle: "Solidity errors",
      },
      ARTIFACTS: {
        min: 1000,
        max: 1099,
        websiteSubTitle: "Compilation artifacts related errors",
      },
      NODE: {
        min: 1100,
        max: 1199,
        websiteSubTitle: "Hardhat node errors",
      },
      TEST_PLUGIN: {
        min: 1200,
        max: 1299,
        websiteSubTitle: "Hardhat test plugin errors",
      },
      COVERAGE: {
        min: 1300,
        max: 1399,
        websiteSubTitle: "Hardhat coverage errors",
      },
    },
  },
  IGNITION: {
    min: 10000,
    max: 19999,
    pluginId: "hardhat-ignition",
    websiteTitle: "Hardhat Ignition",
    CATEGORIES: {
      GENERAL: {
        min: 10000,
        max: 10099,
        websiteSubTitle: "General errors",
      },
      INTERNAL: {
        min: 10100,
        max: 10199,
        websiteSubTitle: "Internal errors",
      },
      MODULE: {
        min: 10200,
        max: 10299,
        websiteSubTitle: "Module errors",
      },
      SERIALIZATION: {
        min: 10300,
        max: 10399,
        websiteSubTitle: "Serialization errors",
      },
      EXECUTION: {
        min: 10400,
        max: 10499,
        websiteSubTitle: "Execution errors",
      },
      RECONCILIATION: {
        min: 10500,
        max: 10599,
        websiteSubTitle: "Reconciliation errors",
      },
      WIPE: {
        min: 10600,
        max: 10699,
        websiteSubTitle: "Wipe errors",
      },
      VALIDATION: {
        min: 10700,
        max: 10799,
        websiteSubTitle: "Validation errors",
      },
      STATUS: {
        min: 10800,
        max: 10899,
        websiteSubTitle: "Status errors",
      },
      DEPLOY: {
        min: 10900,
        max: 10999,
        websiteSubTitle: "Deploy errors",
      },
      VERIFY: {
        min: 11000,
        max: 11099,
        websiteSubTitle: "Verify errors",
      },
      STRATEGIES: {
        min: 11100,
        max: 11199,
        websiteSubTitle: "Strategies errors",
      },
      LIST_TRANSACTIONS: {
        min: 11200,
        max: 11299,
        websiteSubTitle: "List transactions errors",
      },
      TRACK_TRANSACTIONS: {
        min: 11300,
        max: 11399,
        websiteSubTitle: "Track transactions errors",
      },
    },
  },
  HARDHAT_ETHERS: {
    min: 20000,
    max: 29999,
    pluginId: "hardhat-ethers",
    websiteTitle: "Hardhat Ethers",
    CATEGORIES: {
      GENERAL: {
        min: 20000,
        max: 20099,
        websiteSubTitle: "General errors",
      },
    },
  },
  HARDHAT_MOCHA: {
    min: 30000,
    max: 39999,
    pluginId: "hardhat-mocha",
    websiteTitle: "Hardhat Mocha",
    CATEGORIES: {
      GENERAL: {
        min: 30000,
        max: 30099,
        websiteSubTitle: "General errors",
      },
    },
  },
  HARDHAT_VIEM: {
    min: 40000,
    max: 49999,
    pluginId: "hardhat-viem",
    websiteTitle: "Hardhat Viem",
    CATEGORIES: {
      GENERAL: {
        min: 40000,
        max: 40099,
        websiteSubTitle: "General errors",
      },
    },
  },
  HARDHAT_KEYSTORE: {
    min: 50000,
    max: 59999,
    pluginId: "hardhat-keystore",
    websiteTitle: "Hardhat Keystore",
    CATEGORIES: {
      GENERAL: {
        min: 50000,
        max: 50099,
        websiteSubTitle: "General errors",
      },
    },
  },
  NETWORK_HELPERS: {
    min: 60000,
    max: 69999,
    pluginId: "hardhat-network-helpers",
    websiteTitle: "Hardhat Network Helpers",
    CATEGORIES: {
      GENERAL: {
        min: 60000,
        max: 60099,
        websiteSubTitle: "General errors",
      },
    },
  },
  CHAI_MATCHERS: {
    min: 70000,
    max: 79999,
    pluginId: "hardhat-ethers-chai-matchers",
    websiteTitle: "Hardhat Chai Matchers",
    CATEGORIES: {
      GENERAL: {
        min: 70000,
        max: 70099,
        websiteSubTitle: "General errors",
      },
    },
  },
  HARDHAT_VERIFY: {
    min: 80000,
    max: 89999,
    pluginId: "hardhat-verify",
    websiteTitle: "Hardhat Verify",
    CATEGORIES: {
      GENERAL: {
        min: 80000,
        max: 80099,
        websiteSubTitle: "General errors",
      },
      VALIDATION: {
        min: 80100,
        max: 80199,
        websiteSubTitle: "Validation errors",
      },
    },
  },
  HARDHAT_LEDGER: {
    min: 90000,
    max: 90999,
    pluginId: "hardhat-ledger",
    websiteTitle: "Hardhat Ledger",
    CATEGORIES: {
      GENERAL: {
        min: 90000,
        max: 90099,
        websiteSubTitle: "General errors",
      },
    },
  },
};

export const ERRORS = {
  CORE: {
    GENERAL: {
      NOT_INSIDE_PROJECT: {
        number: 1,
        messageTemplate: "You are not inside a Hardhat project.",
        websiteTitle: "You are not inside a Hardhat project",
        websiteDescription: `You are trying to run Hardhat outside of a Hardhat project.

You can learn how to use Hardhat by reading the [Getting Started guide](/hardhat-runner/docs/getting-started).`,
      },
      DUPLICATED_PLUGIN_ID: {
        number: 2,
        shouldBeReported: true,
        messageTemplate:
          'Duplicated plugin id "{id}" found. Did you install multiple versions of the same plugin?',
        websiteTitle: "Duplicated plugin id",
        websiteDescription: `While loading the plugins, two different plugins where found with the same id.

Please double check whether you have multiple versions of the same plugin installed.`,
      },
      NO_CONFIG_FILE_FOUND: {
        number: 3,
        messageTemplate:
          "No Hardhat config file found.\n\nYou can initialize a new project by running Hardhat with --init",
        websiteTitle: "No Hardhat config file found",
        websiteDescription:
          "Hardhat couldn't find a config file in the current directory or any of its parents.",
      },
      INVALID_CONFIG_PATH: {
        number: 4,
        messageTemplate: "Config file {configPath} not found",
        websiteTitle: "Invalid config path",
        websiteDescription:
          "The config file doesn't exist at the provided path.",
      },
      NO_CONFIG_EXPORTED: {
        number: 5,
        messageTemplate: "No config exported in {configPath}",
        websiteTitle: "No config exported",
        websiteDescription: "There is nothing exported from the config file.",
      },
      INVALID_CONFIG_OBJECT: {
        number: 6,
        messageTemplate: "Invalid config exported in {configPath}",
        websiteTitle: "Invalid config object",
        websiteDescription:
          "The config file doesn't export a valid configuration object.",
      },
      ENV_VAR_NOT_FOUND: {
        number: 7,
        messageTemplate: `Configuration Variable "{name}" not found.

You can define it using a plugin like hardhat-keystore, or set it as an environment variable.`,
        websiteTitle: "Configuration variable not found",
        websiteDescription: `A configuration variable was expected to be set as an environment variable, but it wasn't.`,
      },
      INVALID_URL: {
        number: 8,
        messageTemplate: "Invalid URL: {url}",
        websiteTitle: "Invalid URL",
        websiteDescription: `Given value was not a valid URL.`,
      },
      INVALID_BIGINT: {
        number: 9,
        messageTemplate: "Invalid BigInt: {value}",
        websiteTitle: "Invalid BigInt",
        websiteDescription: `Given value was not a valid BigInt.`,
      },
      HARDHAT_PROJECT_ALREADY_CREATED: {
        number: 10,
        messageTemplate:
          "You are trying to initialize a project inside an existing Hardhat project. The path to the project's configuration file is: {hardhatProjectRootPath}.",
        websiteTitle: "Hardhat project already created",
        websiteDescription: `Cannot create a new Hardhat project, the current folder is already associated with a project.`,
      },
      NOT_IN_INTERACTIVE_SHELL: {
        number: 11,
        messageTemplate:
          "You are trying to initialize a project but you are not in an interactive shell.",
        websiteTitle: "Not inside an interactive shell",
        websiteDescription: `You are trying to initialize a project but you are not in an interactive shell.

Please re-run the command inside an interactive shell.`,
      },
      UNSUPPORTED_OPERATION: {
        number: 12,
        messageTemplate: "{operation} is not supported in Hardhat.",
        websiteTitle: "Unsupported operation",
        websiteDescription: `You are trying to perform an unsupported operation.

Unless you are creating a task or plugin, this is probably a bug.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.`,
      },
      ONLY_ESM_SUPPORTED: {
        number: 13,
        messageTemplate: `Hardhat only supports ESM projects. Please be sure to specify "'type': 'module'" in your package.json`,
        websiteTitle: "Only ESM projects are supported",
        websiteDescription: `You are trying to initialize a new Hardhat project, but your package.json does not have the property "type" set to "module".

Currently, Hardhat only supports ESM projects.

Please add the property "type" with the value "module" in your package.json to ensure that your project is recognized as an ESM project.`,
      },
      GLOBAL_OPTION_ALREADY_DEFINED: {
        number: 14,
        messageTemplate:
          'Plugin "{plugin}"" is trying to define the global option "{globalOption}" but it is already defined by plugin "{definedByPlugin}"',
        websiteTitle: "Global option already defined",
        websiteDescription:
          "The global option is already defined by another plugin. Please ensure that global options are uniquely named to avoid conflicts.",
      },
      INVALID_CONFIG: {
        number: 15,
        messageTemplate: `Invalid config:
{errors}`,
        websiteTitle: "Invalid config",
        websiteDescription: `The configuration you provided is invalid. Please check the documentation to learn how to configure Hardhat correctly.`,
      },
      TEMPLATE_NOT_FOUND: {
        number: 16,
        messageTemplate: `Template "{template}" not found`,
        websiteTitle: "Template not found",
        websiteDescription: `The template you provided is not found. Please check the documentation to learn which templates are available.`,
      },
      WORKSPACE_MUST_BE_A_DIRECTORY: {
        number: 17,
        messageTemplate: `Workspace "{workspace}" must be a directory`,
        websiteTitle: "Workspace must be a directory",
        websiteDescription: `The workspace you provided is not a directory. Please ensure that the workspace is a directory and try again.`,
      },
      INVALID_HEX_STRING: {
        number: 18,
        messageTemplate: `Invalid hex string "{value}"`,
        websiteTitle: "Invalid hex string",
        websiteDescription: `Given value was not a valid hex string.`,
      },
      CONFIG_VARIABLE_FORMAT_MUST_INCLUDE_VARIABLE: {
        number: 19,
        messageTemplate: `The format string "{format}" must include {marker} marker`,
        websiteTitle: "Config variable format must include \\{variable\\}",
        websiteDescription: `The config variable format must include the string "\\{variable\\}", which will be replaced with the actual value of the variable.`,
      },
      INVALID_FULLY_QUALIFIED_NAME: {
        number: 20,
        messageTemplate: `Invalid fully qualified contract name "{name}"`,
        websiteTitle: "Invalid fully qualified contract name",
        websiteDescription: `A contract name was expected to be in fully qualified form, but it's not.

A fully qualified name should look like file.sol:Contract`,
      },
      INVALID_CONFIG_FILE: {
        number: 21,
        messageTemplate: `Invalid Hardhat config file at {configPath}:
{errors}`,
        websiteTitle: "Invalid Hardhat config file",
        websiteDescription: `The config file has JS/TS errors.

Please resolve the errors before rerunning the command.`,
      },
      NON_LOCAL_INSTALLATION: {
        number: 22,
        messageTemplate: `Trying to use a non-local installation of Hardhat, which is not supported.\n\nPlease install Hardhat locally using pnpm, npm or yarn, and try again.`,
        websiteTitle: "Hardhat is not installed or installed globally",
        websiteDescription: `You tried to run Hardhat from a global installation or not installing it at all. This is not supported.

Please install Hardhat locally using pnpm, npm or yarn, and try again.`,
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
      NOT_IMPLEMENTED_ERROR: {
        number: 101,
        messageTemplate: "Not implemented: {message}",
        websiteTitle: "Not implemented",
        websiteDescription: `A code path that has not been implemented was unexpectedly triggered.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.`,
        shouldBeReported: true,
      },
    },
    PLUGINS: {
      PLUGIN_NOT_INSTALLED: {
        number: 200,
        messageTemplate: 'Plugin "{pluginId}" is not installed.',
        websiteTitle: "Plugin not installed",
        websiteDescription: `A plugin was included in the Hardhat config but has not been installed into "node_modules".`,
      },
      PLUGIN_MISSING_DEPENDENCY: {
        number: 201,
        messageTemplate:
          'Plugin "{pluginId}" is missing a peer dependency "{peerDependencyName}".',
        websiteTitle: "Plugin missing peer dependency",
        websiteDescription: `A plugin's peer dependency has not been installed.`,
      },
      DEPENDENCY_VERSION_MISMATCH: {
        number: 202,
        messageTemplate:
          'Plugin "{pluginId}" has a peer dependency "{peerDependencyName}" with expected version "{expectedVersion}" but the installed version is "{installedVersion}".',
        websiteTitle: "Dependency version mismatch",
        websiteDescription: `A plugin's peer dependency expected version does not match the version of the installed package.

Please install a version of the peer dependency that meets the plugin's requirements.`,
      },
      PLUGIN_DEPENDENCY_FAILED_LOAD: {
        number: 203,
        messageTemplate: 'Plugin "{pluginId}" dependency could not be loaded.',
        websiteTitle: "Plugin dependency could not be loaded",
        websiteDescription: `The loading of a plugin's dependent plugin failed.`,
      },
    },
    HOOKS: {
      INVALID_HOOK_FACTORY_PATH: {
        number: 300,
        messageTemplate:
          'Plugin "{pluginId}" hook factory for "{hookCategoryName}" is not a valid file:// URL: {path}.',
        websiteTitle: "Plugin hook factory is not a valid file URL",
        websiteDescription: `The loading of a plugin's hook factory failed as the import path is not a valid file:// URL.`,
      },
      UNEXPECTED_HOOK_PARAM_MODIFICATION: {
        number: 301,
        messageTemplate: `Parameter "{paramName}" of hook "{hookCategoryName}#{hookName}" is not allowed to be modified`,
        websiteTitle: "Unexpected hook parameter modification",
        websiteDescription: `The parameter is not allowed to be modified`,
      },
    },
    TASK_DEFINITIONS: {
      INVALID_FILE_ACTION: {
        number: 400,
        messageTemplate:
          "Invalid file action: {action} is not a valid file URL",
        websiteTitle: "Invalid file action",
        websiteDescription: `The setAction function was called with a string parameter that is not a valid file URL. A valid file URL must start with 'file://'.

Please ensure that you are providing a correct file URL.`,
      },
      NO_ACTION: {
        number: 401,
        messageTemplate: `The task "{task}" doesn't have an action`,
        websiteTitle: "Task missing action",
        websiteDescription: `A task was defined without an action.

Please ensure that an action is defined for each task.`,
      },
      POSITIONAL_ARG_AFTER_VARIADIC: {
        number: 402,
        messageTemplate:
          'Cannot add the positional argument "{name}" after a variadic one',
        websiteTitle: "Invalid task definition",
        websiteDescription:
          "A variadic argument must always be the last positional argument in a task definition.",
      },
      REQUIRED_ARG_AFTER_OPTIONAL: {
        number: 403,
        messageTemplate:
          'Cannot add required positional argument "{name}" after an optional one',
        websiteTitle: "Invalid task definition",
        websiteDescription:
          "Required positional arguments must be defined before optional ones in a task definition.",
      },
      TASK_NOT_FOUND: {
        number: 404,
        messageTemplate: 'Task "{task}" not found',
        websiteTitle: "Task not found",
        websiteDescription: "The provided task name does not match any task.",
      },
      SUBTASK_WITHOUT_PARENT: {
        number: 405,
        messageTemplate:
          'Task "{task}" not found when attempting to define subtask "{subtask}". If you intend to only define subtasks, please first define "{task}" as an empty task',
        websiteTitle: "Subtask without parent",
        websiteDescription:
          "The parent task of the subtask being defined was not found. If you intend to only define subtasks, please first define the parent task as an empty task.",
      },
      TASK_ALREADY_DEFINED: {
        number: 406,
        messageTemplate:
          '{actorFragment} trying to define the task "{task}" but it is already defined{definedByFragment}',
        websiteTitle: "Task already defined",
        websiteDescription:
          "The task is already defined. Please ensure that tasks are uniquely named to avoid conflicts.",
      },
      EMPTY_TASK_ID: {
        number: 407,
        messageTemplate: "Task id cannot be an empty string or an empty array",
        websiteTitle: "Empty task id",
        websiteDescription:
          "The task id cannot be an empty string or an empty array. Please ensure that the array of task names is not empty.",
      },
      TASK_OPTION_ALREADY_DEFINED: {
        number: 408,
        messageTemplate:
          '{actorFragment} trying to define task "{task}" with the option "{option}" but it is already defined as a global option by plugin "{globalOptionPluginId}"',
        websiteTitle: "Task option already defined",
        websiteDescription:
          "The task option is already defined as a global option by another plugin. Please ensure that task options are uniquely named to avoid conflicts.",
      },
      TASK_OVERRIDE_OPTION_ALREADY_DEFINED: {
        number: 409,
        messageTemplate:
          '{actorFragment} trying to override the option "{option}" of the task "{task}" but it is already defined',
        websiteTitle: "Task override option already defined",
        websiteDescription:
          "An attempt is being made to override an option that has already been defined. Please ensure that the option is not defined before trying to override it.",
      },
      EMPTY_TASK: {
        number: 410,
        messageTemplate: `Can't run the empty task "{task}"`,
        websiteTitle: "Empty task",
        websiteDescription:
          "The task is empty. Please ensure that tasks have at least one action.",
      },
      INVALID_ACTION_IMPORT: {
        number: 411,
        messageTemplate: 'Unable to import the action for task "{task}".',
        websiteTitle: "Unable to import action for task",
        websiteDescription:
          "Unable to import action for task. Please verify that the the file exists and that it provides a default function export.",
      },
      INVALID_ACTION: {
        number: 412,
        messageTemplate:
          'The action resolved in task "{task}" is not a function',
        websiteTitle: "Invalid action",
        websiteDescription:
          "The action of the task is not a function. Make sure that the file pointed to by the action URL exports a function as the default export.",
      },
      MISSING_VALUE_FOR_TASK_ARGUMENT: {
        number: 413,
        messageTemplate:
          'Missing value for the argument named "{argument}" in the task "{task}"',
        websiteTitle: "Missing value for the task argument",
        websiteDescription: `You tried to run a task, but one of the values of its arguments was missing.

Please double check how you invoked Hardhat or ran your task.`,
      },
      INVALID_VALUE_FOR_TYPE: {
        number: 414,
        messageTemplate:
          'Invalid value "{value}" for argument "{name}" of type "{type}" in the task "{task}"',
        websiteTitle: "Invalid argument type",
        websiteDescription: `One of your task arguments has an invalid type.

Please double check your task arguments.`,
      },
      UNRECOGNIZED_TASK_OPTION: {
        number: 415,
        messageTemplate: 'Invalid option "{option}" for the task "{task}"',
        websiteTitle: "Invalid option value",
        websiteDescription: `One of the options for your task is invalid.

Please double check your arguments.`,
      },
      UNRECOGNIZED_SUBTASK: {
        number: 416,
        messageTemplate:
          'Unrecognized subtask "{invalidSubtask}" for the task "{task}"',
        websiteTitle: "Unrecognized subtask",
        websiteDescription: `The subtask for the task you provided is not recognized.

Please check you have the correct subtask.`,
      },
    },
    ARGUMENTS: {
      INVALID_VALUE_FOR_TYPE: {
        number: 500,
        messageTemplate:
          'Invalid value "{value}" for argument "{name}" of type "{type}"',
        websiteTitle: "Invalid argument type",
        websiteDescription: `One of your Hardhat or task arguments has an invalid type.

Please double check your arguments.`,
      },
      RESERVED_NAME: {
        number: 501,
        messageTemplate: 'Argument name "{name}" is reserved',
        websiteTitle: "Reserved argument name",
        websiteDescription: `One of your Hardhat or task arguments has a reserved name.

Please double check your arguments.`,
      },
      DUPLICATED_NAME: {
        number: 502,
        messageTemplate: 'Argument name "{name}" is already in use',
        websiteTitle: "Argument name already in use",
        websiteDescription: `One of your Hardhat or task argument names is already in use.

Please double check your arguments.`,
      },
      INVALID_NAME: {
        number: 503,
        messageTemplate: `Argument name "{name}" is invalid. It must consist only of alphanumeric characters and cannot start with a number.`,
        websiteTitle: "Invalid argument name",
        websiteDescription: `One of your Hardhat or task argument names is invalid.

Please double check your arguments.`,
      },
      UNRECOGNIZED_OPTION: {
        number: 504,
        messageTemplate:
          'Invalid option "{option}". It is neither a valid global option nor associated with any task. Did you forget to add the task first, or did you misspell it?',
        websiteTitle: "Invalid option value",
        websiteDescription: `One of your Hardhat options is invalid.

Please double check your arguments.`,
      },
      MISSING_VALUE_FOR_ARGUMENT: {
        number: 505,
        messageTemplate:
          'Missing value for the task argument named "{argument}"',
        websiteTitle: "Missing value for the task argument",
        websiteDescription: `You tried to run a task, but one of the values of its arguments was missing.

Please double check how you invoked Hardhat or ran your task.`,
      },
      UNUSED_ARGUMENT: {
        number: 506,
        messageTemplate:
          'The argument with value "{value}" was not consumed because it is not associated with any task.',
        websiteTitle: "Argument was not consumed",
        websiteDescription: `You tried to run a task, but one of your arguments was not consumed.

Please double check how you invoked Hardhat or ran your task.`,
      },
      MISSING_CONFIG_FILE: {
        number: 507,
        messageTemplate:
          'The global option "--config" was passed, but no file path was provided.',
        websiteTitle: "Missing configuration file path",
        websiteDescription: `A path to the configuration file is expected after the global option "--config", but none was provided.

Please double check your arguments.`,
      },
      CANNOT_COMBINE_INIT_AND_CONFIG_PATH: {
        number: 508,
        messageTemplate:
          'The global option "--config" cannot be used with the "init" command',
        websiteTitle:
          'The global option "--config" cannot be used with the "init" command',
        websiteDescription: `The global option "--config" cannot be used with the "init" command.

Please double check your arguments.`,
      },
      CANNOT_GROUP_OPTIONS: {
        number: 509,
        messageTemplate:
          'Invalid option "{option}". Options cannot be grouped together. Try providing the options separately.',
        websiteTitle: "Options grouping is not supported",
        websiteDescription: `Options cannot be grouped together.

Please double check your arguments, and try providing the options separately.`,
      },
      CANNOT_REPEAT_OPTIONS: {
        number: 510,
        messageTemplate:
          'Invalid option "{option}". Options of type "{type}" cannot be repeated.',
        websiteTitle: "Options repetition is not supported",
        websiteDescription: `Some options cannot be repeated.

Please double check your arguments.`,
      },
      INVALID_SHORT_NAME: {
        number: 511,
        messageTemplate: `Argument short name "{name}" is invalid. It must consist of exactly one letter.`,
        websiteTitle: "Invalid short argument name",
        websiteDescription: `One of your Hardhat or task short argument names is invalid.

Please double check your arguments.`,
      },
    },
    BUILTIN_TASKS: {
      RUN_FILE_NOT_FOUND: {
        number: 600,
        messageTemplate: `Script "{script}" doesn't exist`,
        websiteTitle: "Script doesn't exist",
        websiteDescription: `Tried to use \`hardhat run\` to execute a nonexistent script.

Please double check your script's path.`,
      },
    },
    NETWORK: {
      INVALID_URL: {
        number: 700,
        messageTemplate: 'Invalid URL "{value}" for network or forking.',
        websiteTitle: "Invalid URL for network or forking",
        websiteDescription: `You are trying to connect to a network with an invalid network or forking URL.

Please check that you are sending a valid URL string for the network or forking \`URL\` parameter.`,
      },
      INVALID_REQUEST_PARAMS: {
        number: 701,
        messageTemplate:
          "Invalid request arguments: only array parameters are supported.",
        websiteTitle: "Invalid method parameters",
        websiteDescription:
          "The JSON-RPC request parameters are invalid. You are trying to make an EIP-1193 request with object parameters, but only array parameters are supported. Ensure that the 'params' parameter is correctly specified as an array in your JSON-RPC request.",
      },
      INVALID_JSON_RESPONSE: {
        number: 702,
        messageTemplate: "Invalid JSON-RPC response received: {response}",
        websiteTitle: "Invalid JSON-RPC response",
        websiteDescription: `One of your JSON-RPC requests received an invalid response.

Please make sure your node is running, and check your internet connection and networks config.`,
      },
      CONNECTION_REFUSED: {
        number: 703,
        messageTemplate: `Cannot connect to the network "{network}".
Please make sure your node is running, and check your internet connection and networks config`,
        websiteTitle: "Cannot connect to the network",
        websiteDescription: `Cannot connect to the network.

Please make sure your node is running, and check your internet connection and networks config.`,
      },
      NETWORK_TIMEOUT: {
        number: 704,
        messageTemplate: `Network connection timed out.
Please check your internet connection and networks config`,
        websiteTitle: "Network timeout",
        websiteDescription: `One of your JSON-RPC requests timed out.

Please make sure your node is running, and check your internet connection and networks config.`,
      },
      NETWORK_NOT_FOUND: {
        number: 705,
        messageTemplate: `The network "{networkName}" is not defined in your networks config.`,
        websiteTitle: "Network not found",
        websiteDescription: `The network you are trying to connect to is not found.

Please double check that the network is correctly defined in your networks config.`,
      },
      INVALID_CHAIN_TYPE: {
        number: 706,
        messageTemplate: `The provided chain type "{chainType}" does not match the network's chain type "{networkChainType}" for network "{networkName}".`,
        websiteTitle: "Invalid chain type",
        websiteDescription: `The chain type does not match the network's chain type.

If you want to use a different chain type, please update your networks config.`,
      },
      INVALID_CONFIG_OVERRIDE: {
        number: 707,
        messageTemplate: `Invalid config override:
{errors}`,
        websiteTitle: "Invalid config override",
        websiteDescription: `The configuration override you provided is invalid.`,
      },
      INVALID_GLOBAL_CHAIN_ID: {
        number: 708,
        messageTemplate:
          'Hardhat was set to use chain id "{configChainId}", but connected to a chain with id "{connectionChainId}".',
        websiteTitle: "Invalid global chain id",
        websiteDescription: `Hardhat was set to use a chain id but connected to a chain with a different id`,
      },
      NO_REMOTE_ACCOUNT_AVAILABLE: {
        number: 709,
        messageTemplate:
          "No local account was set and there are accounts in the remote node.",
        websiteTitle: "No remote account available",
        websiteDescription:
          "No local account was set and there are accounts in the remote node",
      },
      ETHSIGN_MISSING_DATA_PARAM: {
        number: 710,
        messageTemplate: `Missing "data" param when calling eth_sign.`,
        websiteTitle: `Missing "data" param when calling eth_sign`,
        websiteDescription: `You called "eth_sign" with incorrect parameters.

Please check that you are sending a "data" parameter.`,
      },
      PERSONALSIGN_MISSING_ADDRESS_PARAM: {
        number: 711,
        messageTemplate: `Missing "address" param when calling personal_sign.`,
        websiteTitle: `Missing "address" param when calling personal_sign`,
        websiteDescription: `You called "personal_sign" with incorrect parameters.

Please check that you are sending an "address" parameter.`,
      },
      ETHSIGN_TYPED_DATA_V4_INVALID_DATA_PARAM: {
        number: 712,
        messageTemplate: `Invalid "data" param when calling eth_signTypedData_v4.`,
        websiteTitle: `Invalid "data" param when calling eth_signTypedData_v4`,
        websiteDescription: `You called "eth_signTypedData_v4" with incorrect parameters.

Please check that you are sending a "data" parameter with a JSON string or object conforming to EIP712 TypedData schema.`,
      },
      MISSING_TX_PARAM_TO_SIGN_LOCALLY: {
        number: 713,
        messageTemplate: `Missing param "{param}" from a tx being signed locally.`,
        websiteTitle: "Missing transaction parameter",
        websiteDescription: `You are trying to send a transaction with a locally managed account, and some parameters are missing.

Please double check your transactions' parameters.`,
      },
      MISSING_FEE_PRICE_FIELDS: {
        number: 714,
        messageTemplate:
          "Tried to sign a transaction locally, but gasPrice, maxFeePerGas, and maxPriorityFeePerGas were missing.",
        websiteTitle: "Missing fee price parameters",
        websiteDescription: `You are trying to send a transaction with a locally managed account, and no fee price parameters were provided. You need to send gasPrice, or maxFeePerGas and maxPriorityFeePerGas.

Please double check your transactions' parameters.`,
      },
      INCOMPATIBLE_FEE_PRICE_FIELDS: {
        number: 715,
        messageTemplate:
          "An incompatible transaction with gasPrice and EIP-1559 fee price fields.",
        websiteTitle: "Incompatible fee price parameters",
        websiteDescription: `You are trying to send a transaction with a locally managed account, and its parameters are incompatible. You sent both gasPrice, and maxFeePerGas or maxPriorityFeePerGas.

Please double check your transactions' parameters.`,
      },
      NOT_LOCAL_ACCOUNT: {
        number: 716,
        messageTemplate: `Account "{account}" is not managed by the node you are connected to.`,
        websiteTitle: "Unrecognized account",
        websiteDescription: `You are trying to send a transaction or sign some data with an account not managed by your Ethereum node nor Hardhat.

Please double check your accounts and the "from" parameter in your RPC calls.`,
      },
      INVALID_HD_PATH: {
        number: 717,
        messageTemplate: `HD path "{path}" is invalid. Read about BIP32 to know about the valid forms.`,
        websiteTitle: "Invalid HD path",
        websiteDescription: `An invalid HD/BIP32 derivation path was provided in your config.

Read the [documentation](https://hardhat.org/hardhat-runner/docs/config#hd-wallet-config) to learn how to define HD accounts correctly.`,
      },
      CANT_DERIVE_KEY: {
        number: 718,
        messageTemplate: `Cannot derive key "{path}" from mnemonic "{mnemonic}". Try using another mnemonic or deriving fewer keys.`,
        websiteTitle: "Could not derive an HD key",
        websiteDescription: `One of your HD keys could not be derived.

Try using another mnemonic or deriving less keys.`,
      },
      WRONG_VALIDATION_PARAMS: {
        number: 719,
        messageTemplate:
          "Validation of parameters against the schemas failed for the following reason: {reason}",
        websiteTitle: "Invalid validation parameters",
        websiteDescription:
          "The validation of parameters against the schemas failed.",
      },
      INVALID_NETWORK_TYPE: {
        number: 720,
        messageTemplate:
          'The provided network type "{networkType}" for network "{networkName}" is not recognized, only `http` and `edr` are supported.',
        websiteTitle: "Invalid network type",
        websiteDescription: `The network manager only supports the network types 'http' and 'edr-simulated'.`,
      },
      DATA_FIELD_CANNOT_BE_NULL_WITH_NULL_ADDRESS: {
        number: 721,
        messageTemplate: `The "to" field is undefined, and the "data" field is also undefined; however, a transaction to the null address cannot have an undefined "data" field.`,
        websiteTitle: "Transaction to null address cannot have undefined data",
        websiteDescription:
          "The transaction to the null address cannot have undefined data",
      },
      PROVIDER_CLOSED: {
        number: 722,
        messageTemplate: "The provider has been closed.",
        websiteTitle: "Provider closed",
        websiteDescription:
          "The provider your are trying to use has been closed. Please create a new one using hre.network.connect() and try again.",
      },
      INCOMPATIBLE_EIP7702_FIELDS: {
        number: 723,
        messageTemplate:
          "An incompatible transaction with gasPrice and EIP-7702 fields.",
        websiteTitle: "Incompatible EIP-7702 parameters",
        websiteDescription: `You are trying to send a transaction with a locally managed
account, and its parameters are incompatible. You sent both gasPrice and authorizationList.

Please double check your transactions' parameters.`,
      },
    },
    SOLIDITY_TESTS: {
      BUILD_INFO_NOT_FOUND_FOR_CONTRACT: {
        number: 800,
        shouldBeReported: true,
        messageTemplate: `Build info not found for contract "{fqn}"`,
        websiteTitle: `Build info not found for contract`,
        websiteDescription: `Build info not found for contract while compiling Solidity test contracts.`,
      },
      RUNNER_TIMEOUT: {
        number: 801,
        messageTemplate: `Runner timed out after {duration} ms.

Remaining test suites: {suites}`,
        websiteTitle: `Runner timed out`,
        websiteDescription: `Runner timed out while running Solidity tests.`,
      },
      UNHANDLED_EDR_ERROR_SOLIDITY_TESTS: {
        number: 802,
        shouldBeReported: true,
        messageTemplate:
          "Unhandled EDR error while running Solidity tests: {error}",
        websiteTitle: "Unhandled EDR error in Solidity tests",
        websiteDescription: "Unhandled EDR error while running Solidity tests.",
      },
    },
    SOLIDITY: {
      PROJECT_ROOT_RESOLUTION_ERROR: {
        number: 900,
        messageTemplate: `There was an error while resolving the project file "{filePath}":

{error}`,
        websiteTitle: "Project file resolution error",
        websiteDescription: `There was an error while resolving the project file.

Please double-check your configuration. If it keeps happening, please report it.`,
      },
      NPM_ROOT_RESOLUTION_ERROR: {
        number: 901,
        messageTemplate: `There was an error while resolving the npm module "{npmModule}" when trying to compile it:

{error}`,
        websiteTitle: "Npm file resolution error",
        websiteDescription: `There was an error while resolving an npm module that you are trying to compile and generate artifacts for.

Please double-check your configuration. If it keeps happening, please report it.`,
      },
      IMPORT_RESOLUTION_ERROR: {
        number: 902,
        messageTemplate: `There was an error while resolving the import "{importPath}" from "{filePath}":

{error}`,
        websiteTitle: "Import resolution error",
        websiteDescription: `There was an error while resolving an import.

Please double-check your import`,
      },
      INVALID_SOLC_VERSION: {
        number: 903,
        messageTemplate: `Solidity version {version} is invalid or hasn't been released yet.

If you are certain it has been released, run "npx hardhat clean --global" and try again`,
        websiteTitle: "Invalid or unreleased `solc` version",
        websiteDescription: `The Solidity version in your config is invalid or hasn't been released yet.

If you are certain it has been released, run \`npx hardhat clean --global\` and try again.`,
      },
      DOWNLOAD_FAILED: {
        number: 904,
        messageTemplate:
          "Couldn't download compiler version {remoteVersion}. Please check your internet connection and try again.",
        websiteTitle: "`solc` download failed",
        websiteDescription: `Couldn't download \`solc\`.

Please check your internet connection and try again.`,
      },
      VERSION_LIST_DOWNLOAD_FAILED: {
        number: 905,
        messageTemplate:
          "Couldn't download compiler version list. Please check your internet connection and try again.",
        websiteTitle: "Couldn't obtain `solc` version list",
        websiteDescription: `Couldn't download \`solc\`'s version list.

Please check your internet connection and try again.`,
      },
      INVALID_DOWNLOAD: {
        number: 906,
        messageTemplate: `Couldn't download compiler version {remoteVersion}: Checksum verification failed.

Please check your internet connection and try again.

If this error persists, run "npx hardhat clean --global".`,
        websiteTitle: "Downloaded `solc` checksum verification failed",
        websiteDescription: `Hardhat downloaded a version of the Solidity compiler, and its checksum verification failed.

Please check your internet connection and try again.

If this error persists, run \`npx hardhat clean --global\`.`,
      },
      CANT_RUN_NATIVE_COMPILER: {
        number: 907,
        messageTemplate: `A native version of solc failed to run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
        websiteTitle: "Failed to run native solc",
        websiteDescription: `Hardhat successfully downloaded a native version of solc but it doesn't run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
      },
      CANT_RUN_SOLCJS_COMPILER: {
        number: 908,
        messageTemplate: `A wasm version of solc failed to run.

If this error persists, run "npx hardhat clean --global".`,
        websiteTitle: "Failed to run solcjs",
        websiteDescription: `Hardhat successfully downloaded a WASM version of solc but it doesn't run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
      },
      COMPILATION_JOB_CREATION_ERROR: {
        number: 909,
        messageTemplate: `Failed to create compilation job for file "{rootFilePath}" using the build profile "{buildProfile}".

{reason}`,
        websiteTitle: "Failed to create compilation job",
        websiteDescription: `Hardhat failed to create a compilation job for a file in your project.

This happens when your files require incompatible versions of solc or you haven't configured a version that works with them`,
      },
      BUILD_FAILED: {
        number: 910,
        messageTemplate: "Compilation failed",
        websiteTitle: "Compilation failed",
        websiteDescription: `Your smart contracts failed to compile.

Please check Hardhat's output for more details.`,
      },
      INVALID_SOLCJS_COMPILER: {
        number: 911,
        messageTemplate: `A wasm version of solc {version} is invalid. The compile function is not available.`,
        websiteTitle: "Invalid solcjs compiler",
        websiteDescription: `Hardhat successfully downloaded a WASM version of solc but it is invalid. The compile function is missing.`,
      },
      BUILD_PROFILE_NOT_FOUND: {
        number: 912,
        messageTemplate: `The build profile "{buildProfileName}" is not defined in your Hardhat config`,
        websiteTitle: "Build profile not defined",
        websiteDescription: `The build profile you are trying to use is not defined in your Hardhat config.`,
      },
      COMPILER_PATH_DOES_NOT_EXIST: {
        number: 913,
        messageTemplate: `The compiler path "{compilerPath}" specified in your config for version {version} does not exist.`,
        websiteTitle: "Compiler path does not exist",
        websiteDescription: `The compiler path you are trying to use does not exist. Ensure you specified the correct path in the config file and that the file exists.`,
      },
      PARSING_VERSION_STRING_FAILED: {
        number: 914,
        messageTemplate: `Could not parse the full compiler version from "{versionString}" using "{compilerPath}"`,
        websiteTitle: "Could not parse a compiler version",
        websiteDescription: `Hardhat failed to parse the full compiler version from the output of the compiler's 'version' command.`,
      },
      UNRECOGNIZED_FILES_NOT_COMPILED: {
        number: 914,
        messageTemplate: `The build process failed because these files you provided haven't been reconized neither as constracts nor tests:
        
{files}`,
        websiteTitle: "Build failed due to unrecognized files",
        websiteDescription: `Hardhat failed to build your contracts and/or tests because you passed a file as parameter, but it wasn't recognized neither as a valid contract nor test.`,
      },
    },
    ARTIFACTS: {
      NOT_FOUND: {
        number: 1000,
        messageTemplate:
          'Artifact for contract "{contractName}" not found. {suggestion}',
        websiteTitle: "Artifact not found",
        websiteDescription: `Tried to read a nonexistent artifact.

Please double check that your contracts have been compiled and double check your artifact's name.`,
      },
      MULTIPLE_FOUND: {
        number: 1001,
        messageTemplate: `There are multiple artifacts for contract "{contractName}", please use a fully qualified name.

Please replace "{contractName}" for one of these options wherever you are trying to read its artifact:

{candidates}
`,
        websiteTitle: "Multiple artifacts found",
        websiteDescription: `There are multiple artifacts that match the given contract name, and Hardhat doesn't know which one to use.

Please use the fully qualified name of the contract to disambiguate it.`,
      },
    },
    NODE: {
      INVALID_NETWORK_TYPE: {
        number: 1100,
        messageTemplate: `The provided node network type "{networkType}" for network "{networkName}" is not recognized, only 'edr-simulated' is supported.`,
        websiteTitle: "Invalid node network type",
        websiteDescription: `The node only supports the 'edr-simulated' network type.`,
      },
    },
    TEST_PLUGIN: {
      CANNOT_DETERMINE_TEST_RUNNER: {
        number: 1200,
        messageTemplate: `Cannot determine a test runner for the following files: {files}. Please check whether these files are correctly included in the test paths defined by your test plugins in the Hardhat configuration. If they are, this likely indicates an issue with a plugin not correctly detecting the files.`,
        websiteTitle: "Cannot determine a test runner for files",
        websiteDescription: `Cannot determine a test runner for the test files. This may be because the files are not correctly included in the test paths defined by the test plugins in the Hardhat configuration. If they are correctly included, this likely indicates an issue with a plugin failing to detect the files.`,
      },
    },
    COVERAGE: {
      SOURCE_NOT_INSTRUMENTED: {
        number: 1300,
        messageTemplate: `The source file "{sourceName}" could not be instrumented for coverage.`,
        websiteTitle: "Source file not instrumented for coverage",
        websiteDescription: `The source file could not be instrumented for coverage.`,
      },
      IMPORT_PATH_ALREADY_DEFINED: {
        number: 1301,
        messageTemplate: `The import path "{importPath}" is already defined in the compilation sources`,
        websiteTitle: "Import path already defined in compilation sources",
        websiteDescription: `The import path is already defined in the compilation sources`,
      },
    },
  },
  IGNITION: {
    GENERAL: {
      ASSERTION_ERROR: {
        number: 10000,
        messageTemplate:
          "Internal Hardhat Ignition invariant was violated: {description}",
        websiteTitle: "Internal Hardhat Ignition invariant was violated",
        websiteDescription: `An internal Hardhat Ignition invariant was violated.`,
      },
      UNSUPPORTED_DECODE: {
        number: 10001,
        messageTemplate:
          "Hardhat Ignition can't decode ethers.js value of type {type}: {value}",
        websiteTitle: "Unsupported ethers.js value",
        websiteDescription: "Unsupported ethers.js value",
      },
      ARTIFACT_MIGRATION_NEEDED: {
        number: 10002,
        messageTemplate:
          "Hardhat Ignition needs to migrate this deployments artifacts to the new format. Please run `npx hardhat ignition migrate {deploymentId}`",
        websiteTitle: "Artifact migration needed",
        websiteDescription:
          "Hardhat Ignition needs to migrate the artifacts to the new format. Please run `npx hardhat ignition migrate {deploymentId}`",
      },
    },
    INTERNAL: {
      INTERNAL_ERROR: {
        number: 10100,
        shouldBeReported: true,
        messageTemplate: "Hardhat Ignition Internal Error",
        websiteTitle: "An internal error to Hardhat Ignition has occurred",
        websiteDescription: `An internal error to Hardhat Ignition has occurred`,
      },
      TEMPLATE_INVALID_VARIABLE_NAME: {
        number: 10101,
        messageTemplate:
          "Variable names can only include ascii letters and numbers, and start with a letter, but got {variable}",
        websiteTitle: "Invalid variable name",
        websiteDescription: `One of your Hardhat Ignition template variables has an invalid name`,
      },
      TEMPLATE_VARIABLE_NOT_FOUND: {
        number: 10102,
        messageTemplate:
          "Variable {variable}'s tag not present in the template",
        websiteTitle: "Variable tag not found in template",
        websiteDescription: `One of your Hardhat Ignition template variables has a tag that is not present in the template`,
      },
      TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG: {
        number: 10103,
        messageTemplate:
          "Template values can't include variable tags, but {variable}'s value includes one",
        websiteTitle: "Template value includes variable tag",
        websiteDescription: `One of your Hardhat Ignition template variables has a value that includes a variable tag`,
      },
      ETHERSCAN_API_KEY_NOT_CONFIGURED: {
        number: 10104,
        messageTemplate: "No etherscan API key configured",
        websiteTitle: "No etherscan API key configured",
        websiteDescription: `You are trying to run verification during a Hardhat Ignition deploy, but there is no Etherscan API Key set.`,
      },
      CANNOT_RESET_EPHEMERAL_NETWORK: {
        number: 10105,
        messageTemplate:
          "Deploy cancelled: Cannot reset deployment on ephemeral Hardhat network",
        websiteTitle: "Cannot reset deployment on ephemeral Hardhat network",
        websiteDescription: `The reset flag can only used against a persistent network. You are trying to reset a deployment against an in-memory network.`,
      },
      NO_MODULES_FOUND: {
        number: 10106,
        messageTemplate: "No Ignition modules found",
        websiteTitle: "No Ignition modules found",
        websiteDescription:
          "Ignition was unable to find the module requested for deployment.",
      },
      FAILED_TO_PARSE_JSON: {
        number: 10107,
        messageTemplate: "Could not parse JSON parameters",
        websiteTitle: "Could not parse JSON parameters",
        websiteDescription:
          "Ignition failed to parse the JSON parameters for deployment. Review the JSON and try again.",
      },
      INVALID_DEPLOYMENT_ID: {
        number: 10108,
        messageTemplate: `The deployment-id "{deploymentId}" contains banned characters, ids can only contain alphanumerics, dashes or underscores`,
        websiteTitle: "The deployment-id contains banned characters",
        websiteDescription:
          "The deployment-id being used for the Hardhat Ignition deployment contains banned characters. Deployment ids can only contain alphanumerics, dashes or underscores.",
      },
      IGNITION_CLIENT_EXTENSION_NOT_INSTALLED: {
        number: 10109,
        messageTemplate:
          "Please install either `@nomicfoundation/hardhat-ignition-viem` or `@nomicfoundation/hardhat-ignition-ethers` to use Ignition in your Hardhat tests",
        websiteTitle:
          "Neither the `viem` or `ethers` Ignition extension plugin is installed.",
        websiteDescription:
          "Please install either `@nomicfoundation/hardhat-ignition-viem` or `@nomicfoundation/hardhat-ignition-ethers` to use Ignition in your Hardhat tests",
      },
      UNKNOWN_TRANSACTION_TYPE: {
        number: 10110,
        shouldBeReported: true,
        messageTemplate: `Unknown transaction type: "{type}"`,
        websiteTitle:
          "Hardhat Ignition was unable to display an unknown transaction type",
        websiteDescription:
          "Hardhat Ignition was unable to display an unknown transaction type",
      },
      PARAMETER_EXCEEDS_MAXIMUM_SAFE_INTEGER: {
        number: 10111,
        messageTemplate: `Parameter "{parameter}" exceeds maximum safe integer size. Encode the value as a string using bigint notation: "{value}n"`,
        websiteTitle: "Parameter exceeds maximum safe integer size",
        websiteDescription: "Parameter exceeds maximum safe integer size",
      },
      MODULE_VALIDATION_FAILED: {
        number: 10112,
        messageTemplate:
          "Module validation failed. Check the stack trace above to identify the issue and its source code location.",
        websiteTitle: "Module validation failed.",
        websiteDescription:
          "Hardhat Ignition found problems while validating the module. Please review the module and try again.",
      },
      FAILED_TO_PARSE_DEPLOYMENT_PARAMETERS: {
        number: 10113,
        messageTemplate: `Could not parse parameters from "{filepath}"`,
        websiteTitle: "Parsing of deployment parameters failed.",
        websiteDescription: "Parsing of deployment parameters failed.",
      },
      VISUALIZATION_TEMPLATE_DIR_NOT_FOUND: {
        number: 10114,
        shouldBeReported: true,
        messageTemplate: `Unable to find template directory: "{templateDir}"`,
        websiteTitle: "Visualization template directory not found",
        websiteDescription: "Visualization template directory not found",
      },
      MODULE_NOT_FOUND_AT_PATH: {
        number: 10115,
        messageTemplate: `Could not find a module file at the path: "{modulePath}"`,
        websiteTitle: "Ignition module not found",
        websiteDescription:
          "Hardhat Ignition was not able to find an Ignition Module at the given path.",
      },
      MODULE_OUTSIDE_MODULE_DIRECTORY: {
        number: 10116,
        messageTemplate: `The referenced module file "{modulePath}" is outside the module directory "{shortModulesDirectoryName}"`,
        websiteTitle: "Ignition module outside of module directory",
        websiteDescription:
          "Ignition modules must be located within the module directory.",
      },
      VIEM_TEST_HELPER_ERROR: {
        number: 10117,
        messageTemplate: `Hardhat Ignition Viem Test Error: {message}`,
        websiteTitle: "Test error in Hardhat Ignition Viem's test helper",
        websiteDescription:
          "Test error in Hardhat Ignition Viem's test helper.",
      },
      ARTIFACT_PATH_NOT_FOUND: {
        number: 10118,
        messageTemplate: `Artifact path not found for "{contractName}"`,
        websiteTitle:
          "Hardhat Ignition unable to find artifact path for the contract name",
        websiteDescription:
          "Hardhat Ignition unable to find artifact path for the contract name",
      },
      ONLY_ONE_IGNITION_EXTENSION_PLUGIN_ALLOWED: {
        number: 10119,
        messageTemplate:
          "Found ethers and viem, but only one Hardhat Ignition extension plugin can be used at a time",
        websiteTitle: "Only one Ignition extension plugin allowed",
        websiteDescription: `Both the ethers and viem Ignition extension plugins were found, but only one can be used at a time.

Please only include one of the plugins in your Hardhat configuration.`,
      },
      DEPLOYMENT_ERROR: {
        number: 10120,
        messageTemplate: "Hardhat Ignition deployment error: {message}",
        websiteTitle: "Hardhat Ignition deployment error",
        websiteDescription: `Hardhat Ignition was not able to successfully complete a deployment.

Please review the error message and try again.`,
      },
      NO_DEFAULT_VIEM_WALLET_CLIENT: {
        number: 10121,
        messageTemplate:
          "No default wallet client found while creating Viem contract instances for deployed contracts",
        websiteTitle: "No default Viem wallet client found",
        websiteDescription: `Hardhat Ignition will use the default wallet client to create Viem contract instances for deployed contracts. No wallet clients were found.`,
      },
    },
    MODULE: {
      INVALID_MODULE_ID: {
        number: 10200,
        messageTemplate: "Module id must be a string",
        websiteTitle: "Invalid module id type",
        websiteDescription: `Module id must be a string`,
      },
      INVALID_MODULE_ID_CHARACTERS: {
        number: 10201,
        messageTemplate:
          'The moduleId "{moduleId}" is invalid. Module ids can only have alphanumerics and underscore, and they must start with an alphanumeric.',
        websiteTitle: "Invalid module id",
        websiteDescription: `Module ids can only have alphanumerics and underscore, and they must start with an alphanumeric.`,
      },
      INVALID_MODULE_DEFINITION_FUNCTION: {
        number: 10202,
        messageTemplate: "Module definition function must be a function.",
        websiteTitle: "Invalid module definition function",
        websiteDescription: `Module definition function must be a function.`,
      },
      ASYNC_MODULE_DEFINITION_FUNCTION: {
        number: 10203,
        messageTemplate:
          "The callback passed to 'buildModule' for {moduleDefinitionId} returns a Promise; async callbacks are not allowed in 'buildModule'.",
        websiteTitle: "Async module definition function",
        websiteDescription: `Async callbacks are not allowed in 'buildModule'.`,
      },
      DUPLICATE_MODULE_ID: {
        number: 10204,
        messageTemplate:
          "The following module ids are duplicated: {duplicateModuleIds}. Please make sure all module ids are unique.",
        websiteTitle: "Duplicate module ids",
        websiteDescription: `Please make sure all module ids are unique.`,
      },
    },
    SERIALIZATION: {
      INVALID_FUTURE_ID: {
        number: 10300,
        messageTemplate:
          "Unable to lookup future during deserialization: {futureId}",
        websiteTitle: "Invalid future id",
        websiteDescription: `Unable to lookup future during deserialization`,
      },
      INVALID_FUTURE_TYPE: {
        number: 10301,
        messageTemplate: "Invalid FutureType {type} as serialized argument",
        websiteTitle: "Invalid future type",
        websiteDescription: `Invalid FutureType as serialized argument`,
      },
      LOOKAHEAD_NOT_FOUND: {
        number: 10302,
        messageTemplate: "Lookahead value {key} missing",
        websiteTitle: "Lookahead value not found",
        websiteDescription: `Lookahead value missing`,
      },
    },
    EXECUTION: {
      DROPPED_TRANSACTION: {
        number: 10400,
        messageTemplate:
          "Error while executing {futureId}: all the transactions of its network interaction {networkInteractionId} were dropped. Please try rerunning Hardhat Ignition.",
        websiteTitle: "Dropped transaction",
        websiteDescription: `One of the transactions sent by Hardhat Ignition was dropped`,
      },
      INVALID_JSON_RPC_RESPONSE: {
        number: 10401,
        messageTemplate: "Invalid JSON-RPC response for {method}: {response}",
        websiteTitle: "Invalid JSON-RPC response",
        websiteDescription: `Hardhat Ignition received an invalid JSON-RPC response for the given method`,
      },
      WAITING_FOR_CONFIRMATIONS: {
        number: 10402,
        messageTemplate:
          "You have sent transactions from {sender} and they interfere with Hardhat Ignition. Please wait until they get {requiredConfirmations} confirmations before running Hardhat Ignition again.",
        websiteTitle: "Waiting for confirmations",
        websiteDescription: `Waiting for confirmations for transactions sent from the sender`,
      },
      WAITING_FOR_NONCE: {
        number: 10403,
        messageTemplate:
          "You have sent transactions from {sender} with nonce {nonce} and it interferes with Hardhat Ignition. Please wait until they get {requiredConfirmations} confirmations before running Hardhat Ignition again.",
        websiteTitle: "Waiting for nonce",
        websiteDescription: `Waiting for confirmations for transactions sent from the sender`,
      },
      INVALID_NONCE: {
        number: 10404,
        messageTemplate:
          "The next nonce for {sender} should be {expectedNonce}, but is {pendingCount}. Please make sure not to send transactions from {sender} while running this deployment and try again.",
        websiteTitle: "Invalid nonce",
        websiteDescription: `The next nonce for the sender is not what Hardhat Ignition expected`,
      },
      BASE_FEE_EXCEEDS_GAS_LIMIT: {
        number: 10405,
        messageTemplate:
          "The configured base fee exceeds the block gas limit. Please reduce the configured base fee or increase the block gas limit.",
        websiteTitle: "Base fee exceeds gas limit",
        websiteDescription: `The configured base fee exceeds the block gas limit`,
      },
      MAX_FEE_PER_GAS_EXCEEDS_GAS_LIMIT: {
        number: 10406,
        messageTemplate:
          "The calculated max fee per gas exceeds the configured limit.",
        websiteTitle: "Max fee per gas exceeds gas limit",
        websiteDescription: `The calculated max fee per gas exceeds the configured limit`,
      },
      INSUFFICIENT_FUNDS_FOR_TRANSFER: {
        number: 10407,
        messageTemplate:
          "Account {sender} has insufficient funds to transfer {amount} wei",
        websiteTitle: "Insufficient funds for transfer",
        websiteDescription: `Sender account has insufficient funds for transfer`,
      },
      INSUFFICIENT_FUNDS_FOR_DEPLOY: {
        number: 10408,
        messageTemplate:
          "Account {sender} has insufficient funds to deploy the contract",
        websiteTitle: "Insufficient funds for deploy",
        websiteDescription: `Sender account has insufficient funds for deploy`,
      },
      GAS_ESTIMATION_FAILED: {
        number: 10409,
        messageTemplate: "Gas estimation failed: {error}",
        websiteTitle: "Gas estimation failed",
        websiteDescription: `Gas estimation failed`,
      },
      TRANSACTION_LOST: {
        number: 10410,
        messageTemplate: `An error occurred while trying to send a transaction for future {futureId}.
Please use a block explorer to find the hash of the transaction with nonce {nonce} sent from account {sender} and use the following command to add it to your deployment:
npx hardhat ignition track-tx <txHash> <deploymentId> --network <networkName>`,
        websiteTitle: "Transaction lost",
        websiteDescription: `An error occurred while trying to send a transaction`,
      },
    },
    RECONCILIATION: {
      INVALID_EXECUTION_STATUS: {
        number: 10500,
        messageTemplate: "Unsupported execution status: {status}",
        websiteTitle: "Invalid execution status",
        websiteDescription: `Unsupported execution status`,
      },
    },
    WIPE: {
      UNINITIALIZED_DEPLOYMENT: {
        number: 10600,
        messageTemplate:
          "Cannot wipe {futureId} as the deployment hasn't been intialialized yet",
        websiteTitle: "Uninitialized deployment",
        websiteDescription: `Cannot wipe future as the deployment hasn't been intialialized yet`,
      },
      NO_STATE_FOR_FUTURE: {
        number: 10601,
        messageTemplate:
          "Cannot wipe {futureId} as it has no previous execution recorded",
        websiteTitle: "No state for future",
        websiteDescription: `Cannot wipe future as it has no previous execution recorded`,
      },
      DEPENDENT_FUTURES: {
        number: 10602,
        messageTemplate: `Cannot wipe {futureId} as there are dependent futures that have previous executions recorded. Consider wiping these first: {dependents}`,
        websiteTitle: "Dependent futures",
        websiteDescription: `Cannot wipe future as there are dependent futures that have previous executions recorded`,
      },
    },
    VALIDATION: {
      INVALID_DEFAULT_SENDER: {
        number: 10700,
        messageTemplate:
          "Default sender {defaultSender} is not part of the configured accounts.",
        websiteTitle: "Invalid default sender",
        websiteDescription: `The default sender is not part of the configured accounts`,
      },
      MISSING_EMITTER: {
        number: 10701,
        messageTemplate:
          "`options.emitter` must be provided when reading an event from a SendDataFuture",
        websiteTitle: "Missing emitter",
        websiteDescription: `The emitter must be provided when reading an event from a SendDataFuture`,
      },
      INVALID_MODULE: {
        number: 10702,
        messageTemplate: "Module validation failed with reason: {message}",
        websiteTitle: "Module validation failed",
        websiteDescription: `Module validation failed`,
      },
      INVALID_CONSTRUCTOR_ARGS_LENGTH: {
        number: 10703,
        messageTemplate:
          "The constructor of the contract '{contractName}' expects {expectedArgsLength} arguments but {argsLength} were given",
        websiteTitle: "Invalid constructor arguments length",
        websiteDescription: `Invalid constructor arguments length`,
      },
      INVALID_FUNCTION_ARGS_LENGTH: {
        number: 10704,
        messageTemplate:
          "Function {functionName} in contract {contractName} expects {expectedLength} arguments but {argsLength} were given",
        websiteTitle: "Invalid function arguments length",
        websiteDescription: `Invalid function arguments length`,
      },
      INVALID_STATIC_CALL: {
        number: 10705,
        messageTemplate:
          "Function {functionName} in contract {contractName} is not 'pure' or 'view' and should not be statically called",
        websiteTitle: "Invalid static call",
        websiteDescription: `Function is not 'pure' or 'view' and should not be statically called`,
      },
      INDEXED_EVENT_ARG: {
        number: 10706,
        messageTemplate:
          "Indexed argument {argument} of event {eventName} of contract {contractName} is not stored in the receipt (its hash is stored instead), so you can't read it.",
        websiteTitle: "Indexed event argument",
        websiteDescription: `Indexed argument of event is not stored in the receipt`,
      },
      INVALID_OVERLOAD_NAME: {
        number: 10707,
        messageTemplate: "Invalid {eventOrFunction} name '{name}'",
        websiteTitle: "Invalid overload name",
        websiteDescription: `Invalid overload name`,
      },
      OVERLOAD_NOT_FOUND: {
        number: 10708,
        messageTemplate:
          "{eventOrFunction} '{name}' not found in contract {contractName}",
        websiteTitle: "Overload not found",
        websiteDescription: `Overload not found`,
      },
      REQUIRE_BARE_NAME: {
        number: 10709,
        messageTemplate:
          "{eventOrFunction} name '{name}' used for contract {contractName}, but it's not overloaded. Use '{bareName}' instead.",
        websiteTitle: "Overload name used for non-overloaded contract",
        websiteDescription: `Overload name used for non-overloaded contract`,
      },
      OVERLOAD_NAME_REQUIRED: {
        number: 10710,
        messageTemplate: `{eventOrFunction} '{name}' is overloaded in contract {contractName}. Please use one of these names instead:

{normalizedNameList}`,
        websiteTitle: "Overload name required",
        websiteDescription: `Overload name required`,
      },
      INVALID_OVERLOAD_GIVEN: {
        number: 10711,
        messageTemplate: `{eventOrFunction} '{name}' is not a valid overload of '{bareName}' in contract {contractName}. Please use one of these names instead:

{normalizedNameList}`,
        websiteTitle: "Invalid overload given",
        websiteDescription: `Invalid overload given`,
      },
      EVENT_ARG_NOT_FOUND: {
        number: 10712,
        messageTemplate:
          "Event {eventName} of contract {contractName} has no argument named {argument}",
        websiteTitle: "Event argument not found",
        websiteDescription: `Event argument not found`,
      },
      INVALID_EVENT_ARG_INDEX: {
        number: 10713,
        messageTemplate:
          "Event {eventName} of contract {contractName} has only {expectedLength} arguments, but argument {argument} was requested",
        websiteTitle: "Invalid event argument index",
        websiteDescription: `Invalid event argument index`,
      },
      FUNCTION_ARG_NOT_FOUND: {
        number: 10714,
        messageTemplate:
          "Function {functionName} of contract {contractName} has no return value named {argument}",
        websiteTitle: "Function argument not found",
        websiteDescription: `Function argument not found`,
      },
      INVALID_FUNCTION_ARG_INDEX: {
        number: 10715,
        messageTemplate:
          "Function {functionName} of contract {contractName} has only {expectedLength} return values, but value {argument} was requested",
        websiteTitle: "Invalid function argument index",
        websiteDescription: `Invalid function argument index`,
      },
      MISSING_LIBRARIES: {
        number: 10716,
        messageTemplate:
          "Invalid libraries for contract {contractName}: The following libraries are missing: {fullyQualifiedNames}",
        websiteTitle: "Missing libraries",
        websiteDescription: `The following libraries are missing`,
      },
      CONFLICTING_LIBRARY_NAMES: {
        number: 10717,
        messageTemplate:
          "Invalid libraries for contract {contractName}: The names '{inputName}' and '{libName}' clash with each other, please use qualified names for both.",
        websiteTitle: "Conflicting library names",
        websiteDescription: `The library names clash with each other`,
      },
      INVALID_LIBRARY_NAME: {
        number: 10718,
        messageTemplate:
          "Invalid library name {libraryName} for contract {contractName}",
        websiteTitle: "Invalid library name",
        websiteDescription: `Invalid library name`,
      },
      LIBRARY_NOT_NEEDED: {
        number: 10719,
        messageTemplate:
          "Invalid library {libraryName} for contract {contractName}: this library is not needed by this contract.",
        websiteTitle: "Invalid library",
        websiteDescription: `Invalid library`,
      },
      AMBIGUOUS_LIBRARY_NAME: {
        number: 10720,
        messageTemplate: `Invalid libraries for contract {contractName}: The name "{libraryName}" is ambiguous, please use one of the following fully qualified names: {fullyQualifiedNames}`,
        websiteTitle: "Ambiguous library name",
        websiteDescription: `The library name is ambiguous`,
      },
      INVALID_LIBRARY_ADDRESS: {
        number: 10721,
        messageTemplate: `Invalid address {address} for library {libraryName} of contract {contractName}`,
        websiteTitle: "Invalid library address",
        websiteDescription: `Invalid address for library`,
      },
      NEGATIVE_ACCOUNT_INDEX: {
        number: 10722,
        messageTemplate: "Account index cannot be a negative number",
        websiteTitle: "Negative account index",
        websiteDescription: `Account index cannot be a negative number`,
      },
      ACCOUNT_INDEX_TOO_HIGH: {
        number: 10723,
        messageTemplate:
          "Requested account index '{accountIndex}' is greater than the total number of available accounts '{accountsLength}'",
        websiteTitle: "Account index too high",
        websiteDescription: `Requested account index is greater than the total number of available accounts`,
      },
      INVALID_ARTIFACT: {
        number: 10724,
        messageTemplate: "Artifact for contract '{contractName}' is invalid",
        websiteTitle: "Invalid artifact",
        websiteDescription: `Artifact for contract is invalid`,
      },
      MISSING_MODULE_PARAMETER: {
        number: 10725,
        messageTemplate:
          "Module parameter '{name}' requires a value but was given none",
        websiteTitle: "Missing module parameter",
        websiteDescription: `Module parameter requires a value but was given none`,
      },
      INVALID_MODULE_PARAMETER_TYPE: {
        number: 10726,
        messageTemplate: `Module parameter '{name}' must be of type '{expectedType}' but is '{actualType}'`,
        websiteTitle: "Invalid module parameter type",
        websiteDescription: `Module parameter must be of the expected type`,
      },
    },
    STATUS: {
      UNINITIALIZED_DEPLOYMENT: {
        number: 10800,
        messageTemplate:
          "Cannot get status for nonexistant deployment at {deploymentDir}",
        websiteTitle: "Uninitialized deployment",
        websiteDescription: `Cannot get status for nonexistant deployment`,
      },
    },
    DEPLOY: {
      CHANGED_CHAINID: {
        number: 10900,
        messageTemplate: `The deployment's chain cannot be changed between runs. The deployment was previously run against the chain {previousChainId}, but the current network is the chain {currentChainId}.`,
        websiteTitle: "Chain ID changed",
        websiteDescription: `The deployment's chain cannot be changed between runs.`,
      },
      ALREADY_IN_PROGRESS: {
        number: 10901,
        messageTemplate:
          "Another instance of `IgnitionHelper.deploy()` is already in use. Please wait for the previous deployment to finish.",
        websiteTitle: "Deployment already in progress",
        websiteDescription:
          "Another instance of `IgnitionHelper.deploy()` is already in use. Please wait for the previous deployment to finish.",
      },
    },
    VERIFY: {
      UNINITIALIZED_DEPLOYMENT: {
        number: 11000,
        messageTemplate:
          "Cannot verify contracts for nonexistant deployment at {deploymentDir}",
        websiteTitle: "Uninitialized deployment",
        websiteDescription: `Cannot verify contracts for nonexistant deployment`,
      },
      NO_CONTRACTS_DEPLOYED: {
        number: 11001,
        messageTemplate:
          "Cannot verify deployment {deploymentDir} as no contracts were deployed",
        websiteTitle: "No contracts deployed",
        websiteDescription: `Cannot verify deployment as no contracts were deployed`,
      },
      UNSUPPORTED_CHAIN: {
        number: 11002,
        messageTemplate:
          "Verification not natively supported for chainId {chainId}. Please use a custom chain configuration to add support.",
        websiteTitle: "Unsupported chain",
        websiteDescription: `Verification not natively supported for the requested chain`,
      },
    },
    STRATEGIES: {
      UNKNOWN_STRATEGY: {
        number: 11100,
        messageTemplate: `Invalid strategy name "{strategyName}", must be either 'basic' or 'create2'`,
        websiteTitle:
          "Invalid strategy name, must be either 'basic' or 'create2'",
        websiteDescription:
          "Invalid strategy, must be either 'basic' or 'create2'",
      },
      MISSING_CONFIG: {
        number: 11101,
        messageTemplate:
          "No strategy config passed for strategy '{strategyName}'",
        websiteTitle: "Missing strategy config",
        websiteDescription: `No strategy config passed for strategy`,
      },
      MISSING_CONFIG_PARAM: {
        number: 11102,
        messageTemplate:
          "Missing required strategy configuration parameter '{requiredParam}' for the strategy '{strategyName}'",
        websiteTitle: "Missing strategy config parameter",
        websiteDescription: `Missing required strategy configuration parameter`,
      },
      INVALID_CONFIG_PARAM: {
        number: 11103,
        messageTemplate:
          "Strategy configuration parameter '{paramName}' for the strategy '{strategyName}' is invalid: {reason}",
        websiteTitle: "Invalid strategy config parameter",
        websiteDescription: `Strategy configuration parameter is invalid`,
      },
      CREATE_X_NOT_DEPLOYED: {
        number: 11104,
        messageTemplate: "CreateX not deployed on current network {chainId}",
        websiteTitle: "CreateX contract not deployed",
        websiteDescription: `The CreateX contract is not deployed on the current network`,
      },
    },
    LIST_TRANSACTIONS: {
      UNINITIALIZED_DEPLOYMENT: {
        number: 11200,
        messageTemplate:
          "Cannot list transactions for nonexistant deployment at {deploymentDir}",
        websiteTitle: "Uninitialized deployment",
        websiteDescription: `Cannot list transactions for nonexistant deployment`,
      },
    },
    TRACK_TRANSACTIONS: {
      DEPLOYMENT_DIR_NOT_FOUND: {
        number: 11300,
        messageTemplate: "Deployment directory {deploymentDir} not found",
        websiteTitle: "Deployment directory not found",
        websiteDescription: `The deployment directory was not found`,
      },
      UNINITIALIZED_DEPLOYMENT: {
        number: 11301,
        messageTemplate:
          "Cannot track transaction for nonexistant deployment at {deploymentDir}",
        websiteTitle: "Uninitialized deployment",
        websiteDescription: `Cannot track transaction for nonexistant deployment`,
      },
      TRANSACTION_NOT_FOUND: {
        number: 11302,
        messageTemplate: `Transaction {txHash} not found. Please double check the transaction hash and try again.`,
        websiteTitle: "Transaction not found",
        websiteDescription: `The transaction hash you provided was not found on the network.`,
      },
      MATCHING_NONCE_NOT_FOUND: {
        number: 11303,
        messageTemplate: `The transaction you provided doesn't seem to belong to your deployment.
Please double check the error you are getting when running Hardhat Ignition, and the instructions it's providing.`,
        websiteTitle: "Matching nonce not found",
        websiteDescription: `The transaction you provided doesn't seem to belong to your deployment.`,
      },
      KNOWN_TRANSACTION: {
        number: 11304,
        messageTemplate: `The transaction hash that you provided was already present in your deployment.
Please double check the error you are getting when running Hardhat Ignition, and the instructions it's providing.`,
        websiteTitle: "Known transaction",
        websiteDescription: `The transaction hash that you provided was already present in your deployment.`,
      },
      INSUFFICIENT_CONFIRMATIONS: {
        number: 11305,
        messageTemplate: `The transaction you provided doesn't have enough confirmations yet.
Please try again later.`,
        websiteTitle: "Insufficient confirmations",
        websiteDescription: `The transaction you provided doesn't have enough confirmations yet.`,
      },
    },
  },
  HARDHAT_ETHERS: {
    GENERAL: {
      METHOD_NOT_IMPLEMENTED: {
        number: 20000,
        messageTemplate: `Method "{method}" is not implemented`,
        websiteTitle: "Method not implemented",
        websiteDescription: "Method not implemented",
      },
      EVENT_NOT_SUPPORTED: {
        number: 20001,
        messageTemplate: `Event "{event}" is not supported`,
        websiteTitle: "Event not supported",
        websiteDescription: "Event not supported",
      },
      ACCOUNT_INDEX_OUT_OF_RANGE: {
        number: 20002,
        messageTemplate: `Tried to get account with index {accountIndex} but there are only {accountsLength} accounts`,
        websiteTitle: "Account index out of range",
        websiteDescription: "Account index out of range",
      },
      BROADCASTED_TX_DIFFERENT_HASH: {
        number: 20003,
        messageTemplate: `Expected broadcasted transaction to have hash "{txHash}", but got "{broadcastedTxHash}"`,
        websiteTitle: "Broadcasted transaction hash mismatch",
        websiteDescription: "Broadcasted transaction hash mismatch",
      },
      CANNOT_GET_ACCOUNT: {
        number: 20004,
        messageTemplate: `Cannot get account with address "{address}"`,
        websiteTitle: "Cannot get account",
        websiteDescription: "Cannot get account",
      },
      INVALID_BLOCK_TAG: {
        number: 20005,
        messageTemplate: `Invalid block tag "{blockTag}"`,
        websiteTitle: "Invalid block tag",
        websiteDescription: "Invalid block tag",
      },
      INVALID_ARTIFACT_FOR_FACTORY: {
        number: 20006,
        messageTemplate:
          "You are trying to create a contract factory from an artifact, but you have not passed a valid artifact parameter.",
        websiteTitle: "Invalid artifact for contract factory creation",
        websiteDescription: "Invalid artifact for contract factory creation",
      },
      INVALID_ABSTRACT_CONTRACT_FOR_FACTORY: {
        number: 20007,
        messageTemplate: `You are trying to create a contract factory for the contract "{contractName}", which is abstract and can't be deployed. If you want to call a contract using "{contractName}" as its interface use the "getContractAt" function instead.`,
        websiteTitle: "Invalid abstract contract for contract factory creation",
        websiteDescription:
          "Invalid abstract contract for contract factory creation",
      },
      INVALID_ADDRESS_TO_LINK_CONTRACT_TO_LIBRARY: {
        number: 20008,
        messageTemplate: `You tried to link the contract "{contractName}" with the library "{linkedLibraryName}", but you provided this invalid address: {resolvedAddress}`,
        websiteTitle: "Invalid address to link contract",
        websiteDescription: "Invalid address to link contract",
      },
      LIBRARY_NOT_AMONG_CONTRACT_LIBRARIES: {
        number: 20009,
        messageTemplate: `You tried to link the contract "{contractName}" with the library "{linkedLibraryName}", which is not one of its libraries. Detailed message: {detailedMessage}`,
        websiteTitle: "Library is not one of the contract libraries",
        websiteDescription: "Library is not one of the contract libraries",
      },
      AMBIGUOUS_LIBRARY_NAME: {
        number: 20010,
        messageTemplate: `The library name "{linkedLibraryName}" is ambiguous for the contract "{contractName}". It may resolve to one of the following libraries: "{matchingNeededLibrariesFQNs}". To fix this, choose one of these fully qualified library names and replace where appropriate.`,
        websiteTitle: "Ambiguous library name",
        websiteDescription: "Ambiguous library name",
      },
      REFERENCE_TO_SAME_LIBRARY: {
        number: 20011,
        messageTemplate: `The library names "{linkedLibraryName1}" and "{linkedLibraryName2}" refer to the same library and were given as two separate library links. Remove one of them and review your library links before proceeding.`,
        websiteTitle: "Reference to same library",
        websiteDescription: "Reference to same library",
      },
      MISSING_LINK_FOR_LIBRARY: {
        number: 20012,
        messageTemplate: `The contract "{contractName}" is missing links for the following libraries: "{missingLibraries}". Learn more about linking contracts at (https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-ethers#library-linking).`,
        websiteTitle: "Missing links for library",
        websiteDescription: "Missing links for library",
      },
      UNSUPPORTED_TYPE_FOR_DEEP_COPY: {
        number: 20013,
        messageTemplate: `The value "{value}" with type "{type}" is not supported by the deepCopy function.`,
        websiteTitle: "Unsupported type for deep copy",
        websiteDescription: "Unsupported type for deep copy",
      },
      ACCOUNTS_OF_TYPE_REMOTE: {
        number: 20014,
        messageTemplate:
          "Tried to obtain a private key, but the network is configured to use remote accounts.",
        websiteTitle: "Remote accounts are not supported",
        websiteDescription: "Remote accounts are not supported",
      },
      WRONG_ACCOUNTS_FORMAT: {
        number: 20015,
        messageTemplate: `The "accounts" property in your Hardhat configuration file is not set correctly.`,
        websiteTitle: `Invalid "accounts" property in your Hardhat configuration file`,
        websiteDescription: `The "accounts" property in your Hardhat configuration file is not set correctly. Please double check it and try again.`,
      },
      NO_PRIVATE_KEY_FOR_ADDRESS: {
        number: 20016,
        messageTemplate: `No private key can be associated with the address "{address}".`,
        websiteTitle: "Private key for the address could not be found",
        websiteDescription:
          "The private key for the address could not be found. Please double check your private keys and try again.",
      },
    },
  },
  HARDHAT_MOCHA: {
    GENERAL: {
      TEST_TASK_ESM_TESTS_RUN_TWICE: {
        number: 30000,
        messageTemplate: `Your project uses ESM and you've programmatically run your tests twice. This is not supported yet.`,
        websiteTitle: "Running tests twice in an ESM project",
        websiteDescription:
          'You have run your tests twice programmatically and your project is an ESM project (you have `"type": "module"` in your `package.json`, or some of your files have the `.mjs` extension). This is not supported by Mocha yet (https://github.com/mochajs/mocha/issues/2706).',
      },
    },
  },
  HARDHAT_VIEM: {
    GENERAL: {
      NETWORK_NOT_FOUND: {
        number: 40000,
        messageTemplate: `No network with chain id "{chainId}" found.`,
        websiteTitle: "Network not found",
        websiteDescription: `No network with the specified chain id was found. You can override the chain by passing it as a parameter to the client getter:

\`\`\`ts
import { someChain } from "viem/chains";
const client = await hre.viem.getPublicClient({
  chain: someChain,
  ...
});
\`\`\`

You can find a list of supported networks here: https://github.com/wevm/viem/blob/main/src/chains/index.ts`,
      },
      UNSUPPORTED_DEVELOPMENT_NETWORK: {
        number: 40001,
        messageTemplate:
          "Unsupported development network detected. Hardhat and Anvil are the only supported networks.",
        websiteTitle: "Unsupported Development Network",
        websiteDescription: `The chain ID corresponds to a development network, but we were unable to identify it as either Hardhat or Anvil.

Please ensure you're using one of the supported networks.`,
      },
      DEFAULT_WALLET_CLIENT_NOT_FOUND: {
        number: 40002,
        messageTemplate: `No default wallet client found for chain id "{chainId}".`,
        websiteTitle: "Default Wallet Client Not Found",
        websiteDescription: `A default wallet client could not be found for the specified chain ID. This issue may occur if no accounts were configured for the selected network.

To resolve this, make sure to add an account to the specified network in the Hardhat config. Alternatively, you can set a custom wallet client by passing it as a parameter in the relevant function:

\`\`\`ts
const networkConnection = await hre.network.connect(...);
const walletClient = await networkConnection.viem.getWalletClient(address);

await networkConnection.viem.deployContract(contractName, constructorArgs, { walletClient });
await networkConnection.viem.sendDeploymentTransaction(contractName, constructorArgs, { walletClient });
await networkConnection.viem.getContractAt(contractName, address, { walletClient });
\`\`\`
`,
      },
      LINKING_CONTRACT_ERROR: {
        number: 40003,
        messageTemplate: `Error linking the contract "{contractName}":

{error}`,
        websiteTitle: "Error Linking Contract",
        websiteDescription: `An error occurred while linking the contract libraries.

Please check Hardhat's output for more details.`,
      },
      INVALID_CONFIRMATIONS: {
        number: 40004,
        messageTemplate: `Invalid confirmations value. {error}`,
        websiteTitle: "Invalid Confirmations Value",
        websiteDescription: `Invalid confirmations value. The confirmations value provided is invalid.`,
      },
      DEPLOY_CONTRACT_ERROR: {
        number: 40005,
        messageTemplate: `The deployment transaction "{txHash}" was mined in block "{blockNumber}" but its receipt doesn't contain a contract address`,
        websiteTitle: "Deployment Transaction Error",
        websiteDescription:
          "The deployment transaction was mined but its receipt doesn't contain a contract address.",
      },
    },
  },
  HARDHAT_KEYSTORE: {
    GENERAL: {
      INVALID_PASSWORD_OR_CORRUPTED_KEYSTORE: {
        number: 50000,
        messageTemplate: "Invalid password or corrupted keystore file.",
        websiteTitle: "Invalid password or corrupted keystore file",
        websiteDescription:
          "The password you provided is incorrect or the keystore file is corrupted.",
      },
      CANNOT_CHANGED_PASSWORD_FOR_DEV_KEYSTORE: {
        number: 50001,
        messageTemplate: `The keystore "change-password" task cannot be used with the development keystore`,
        websiteTitle: "Cannot change password for dev keystore",
        websiteDescription: `The keystore "change-password" task cannot be used with the development keystore`,
      },
      KEY_NOT_FOUND_DURING_TESTS_WITH_DEV_KEYSTORE: {
        number: 50002,
        messageTemplate: `Key "{key}" not found in the development keystore. Run "npx hardhat keystore set {key} --dev" to set it.`,
        websiteTitle: "Key not found in the development keystore during tests",
        websiteDescription: `Key not found in the development keystore. During tests, configuration variables can only be accessed through the development keystore.

Run \`npx hardhat keystore set <KEY> --dev\` to set it.`,
      },
    },
  },
  NETWORK_HELPERS: {
    GENERAL: {
      ONLY_ALLOW_0X_PREFIXED_STRINGS: {
        number: 60000,
        messageTemplate: `Only hex-encoded strings prefixed with "0x" are accepted`,
        websiteTitle: `Only hex-encoded strings prefixed with "0x" are accepted`,
        websiteDescription: `Only hex-encoded strings prefixed with "0x" are accepted`,
      },
      CANNOT_CONVERT_TO_RPC_QUANTITY: {
        number: 60001,
        messageTemplate: `The value "{value}" cannot be converted into an RPC quantity`,
        websiteTitle: "Cannot converted into an RPC quantity",
        websiteDescription:
          "The value cannot be converted into an RPC quantity",
      },
      INVALID_HEX_STRING: {
        number: 60002,
        messageTemplate: `"{value}" is not a valid hex string`,
        websiteTitle: "Invalid hex string",
        websiteDescription: "The value is not a valid hex string",
      },
      INVALID_TX_HASH: {
        number: 60003,
        messageTemplate: `"{value}" is not a valid transaction hash`,
        websiteTitle: "Invalid transaction hash",
        websiteDescription: "The value is not a valid transaction hash",
      },
      INVALID_ADDRESS: {
        number: 60004,
        messageTemplate: `"{value}" is not a valid address`,
        websiteTitle: "Invalid address",
        websiteDescription: "The value is not a valid address",
      },
      INVALID_CHECKSUM_ADDRESS: {
        number: 60005,
        messageTemplate: `Address "{value}" has an invalid checksum`,
        websiteTitle: "Invalid checksum address",
        websiteDescription: "The address has an invalid checksum",
      },
      BLOCK_NUMBER_SMALLER_THAN_CURRENT: {
        number: 60006,
        messageTemplate: `The block number "{newValue}" is smaller than the current block number "{currentValue}"`,
        websiteTitle: "Block number smaller than the current block number",
        websiteDescription:
          "The block number is smaller than the current block number",
      },
      EVM_SNAPSHOT_VALUE_NOT_A_STRING: {
        number: 60007,
        messageTemplate: `The value returned by evm_snapshot should be a string`,
        websiteTitle: "The evm_snapshot value should be a string",
        websiteDescription:
          "The value returned by evm_snapshot should be a string",
      },
      EVM_REVERT_VALUE_NOT_A_BOOLEAN: {
        number: 60008,
        messageTemplate: `The value returned by evm_revert should be a boolean`,
        websiteTitle: "The evm_revert value should be a boolean",
        websiteDescription:
          "The value returned by evm_revert should be a boolean",
      },
      INVALID_SNAPSHOT: {
        number: 60009,
        messageTemplate: `Trying to restore an invalid snapshot.`,
        websiteTitle: "Trying to restore an invalid snapshot.",
        websiteDescription: "Trying to restore an invalid snapshot.",
      },
      EXPECTED_NON_NEGATIVE_NUMBER: {
        number: 60010,
        messageTemplate: `Invalid input: expected a non-negative number but "{value}" was given.`,
        websiteTitle: "Invalid input, expected a non-negative number",
        websiteDescription: "Invalid input, expected a non-negative number",
      },
      CANNOT_CONVERT_NEGATIVE_NUMBER_TO_RPC_QUANTITY: {
        number: 60011,
        messageTemplate: `Cannot convert negative number "{value}" to RPC quantity`,
        websiteTitle: "Cannot convert negative number to RPC quantity",
        websiteDescription: "Cannot convert negative number to RPC quantity",
      },
      FIXTURE_ANONYMOUS_FUNCTION_ERROR: {
        number: 60012,
        messageTemplate: `Anonymous functions cannot be used as fixtures.

You probably did something like this:

    loadFixture(async () => ... );

Instead, define a fixture function and refer to that same function in each call to loadFixture.

Learn more at (https://hardhat.org/hardhat-network-helpers/docs/reference#fixtures)`,
        websiteTitle: "Anonymous functions cannot be used as fixtures",
        websiteDescription: "Anonymous functions cannot be used as fixtures",
      },
      FIXTURE_SNAPSHOT_ERROR: {
        number: 60013,
        messageTemplate: `There was an error reverting the snapshot of the fixture.

This might be caused by using hardhat_reset and loadFixture calls in a testcase.`,
        websiteTitle: "Error while reverting snapshot",
        websiteDescription: "Error while reverting snapshot",
      },
      CAN_ONLY_BE_USED_WITH_HARDHAT_NETWORK: {
        number: 60014,
        messageTemplate: `This helper can only be used with the Hardhat Network. You are connected to "{networkName}".`,
        websiteTitle:
          "Hardhat network helpers can only be used with the Hardhat Network",
        websiteDescription:
          "Hardhat network helpers can only be used with the Hardhat Network",
      },
      CAN_ONLY_BE_USED_WITH_HARDHAT_NETWORK_VERSIONED: {
        number: 60015,
        messageTemplate: `This helper can only be used with the Hardhat Network. You are connected to "{networkName}", whose identifier is "{version}".`,
        websiteTitle:
          "Hardhat network helpers can only be used with the Hardhat Network - version info",
        websiteDescription:
          "Hardhat network helpers can only be used with the Hardhat Network",
      },
    },
  },
  CHAI_MATCHERS: {
    GENERAL: {
      UNKNOWN_COMPARISON_OPERATION: {
        number: 70000,
        messageTemplate: `Unknown comparison operation "{method}"`,
        websiteTitle: "Unknown comparison operation",
        websiteDescription: "Unknown comparison operation",
      },
      EXPECTED_STRING_OR_ADDRESSABLE: {
        number: 70001,
        messageTemplate: `Expected string or addressable, but got "{account}"`,
        websiteTitle: "Expected string or addressable",
        websiteDescription: "Expected string or addressable",
      },
      ASSERTION_WITHOUT_ERROR_MESSAGE: {
        number: 70002,
        messageTemplate: `Assertion doesn't have an error message. Please open an issue to report this.`,
        websiteTitle: "Assertion doesn't have an error message",
        websiteDescription: `Assertion doesn't have an error message. Please open an issue to report this.`,
        shouldBeReported: true,
      },
      MATCHER_CANNOT_BE_CHAINED_AFTER: {
        number: 70003,
        messageTemplate: `The matcher "{matcher}" cannot be chained after "{previousMatcher}". For more information, please refer to the documentation at: (https://hardhat.org/chaining-async-matchers).`,
        websiteTitle: "Matcher cannot be chained after",
        websiteDescription: `The matcher cannot be chained after another matcher. Please open an issue to report this.`,
      },
      DECODING_ERROR: {
        number: 70004,
        messageTemplate: `There was an error decoding "{encodedData}" as a "{type}. Reason: {reason}"`,
        websiteTitle: "Error while decoding data",
        websiteDescription: `There was an error decoding data`,
      },
      EXPECTED_VALID_TRANSACTION_HASH: {
        number: 70005,
        messageTemplate: `Expected a valid transaction hash, but got "{hash}"`,
        websiteTitle: "Expected a valid transaction hash",
        websiteDescription: `Expected a valid transaction hash`,
      },
      EXPECT_STRING_OR_REGEX_AS_REVERT_REASON: {
        number: 70006,
        messageTemplate:
          "Expected the revert reason to be a string or a regular expression",
        websiteTitle:
          "Expected the revert reason to be a string or a regular expression",
        websiteDescription:
          "Expected the revert reason to be a string or a regular expression",
      },
      FIRST_ARGUMENT_MUST_BE_A_CONTRACT: {
        number: 70007,
        messageTemplate:
          "The first argument of .revertedWithCustomError must be the contract that defines the custom error",
        websiteTitle: "First argument must be a contract",
        websiteDescription: "First argument must be a contract",
      },
      STRING_EXPECTED_AS_CUSTOM_ERROR_NAME: {
        number: 70008,
        messageTemplate: "Expected the custom error name to be a string",
        websiteTitle: "Expected the custom error name to be a string",
        websiteDescription: "Expected the custom error name to be a string",
      },
      CONTRACT_DOES_NOT_HAVE_CUSTOM_ERROR: {
        number: 70009,
        messageTemplate: `The given contract doesn't have a custom error named "{customErrorName}"`,
        websiteTitle:
          "Contract doesn't have a custom error with the specified name",
        websiteDescription:
          "Contract doesn't have a custom error with the specified name",
      },
      REVERT_INVALID_ARGUMENTS_LENGTH: {
        number: 70010,
        messageTemplate:
          "The .revertedWithCustomError matcher expects two arguments: the contract and the custom error name. Arguments should be asserted with the .withArgs helper.",
        websiteTitle:
          "Invalid arguments length for the .revertedWithCustomError matcher",
        websiteDescription:
          "Invalid arguments length for the .revertedWithCustomError matcher",
      },
      WITH_ARGS_FORBIDDEN: {
        number: 70011,
        messageTemplate:
          "[.withArgs] should never happen, please submit an issue to the Hardhat repository",
        websiteTitle:
          "[.withArgs] should never happen, please submit an issue to the Hardhat repository",
        websiteDescription:
          "[.withArgs] should never happen, please submit an issue to the Hardhat repository",
      },
      INDEXED_EVENT_FORBIDDEN: {
        number: 70012,
        messageTemplate:
          "Should not get an indexed event when the assertion type is not event. Please open an issue about this.",
        websiteTitle:
          "Should not get an indexed event when the assertion type is not event",
        websiteDescription:
          "Should not get an indexed event when the assertion type is not event",
      },
      PANIC_CODE_EXPECTED: {
        number: 70013,
        messageTemplate: `Expected the given panic code to be a number-like value, but got "{panicCode}"`,
        websiteTitle: "Expected the given panic code to be a number-like value",
        websiteDescription:
          "Expected the given panic code to be a number-like value",
      },
      ACCOUNTS_NUMBER_DIFFERENT_FROM_BALANCE_CHANGES: {
        number: 70014,
        messageTemplate: `The number of accounts ({accounts}) is different than the number of expected balance changes ({balanceChanges})`,
        websiteTitle:
          "The number of accounts is different than the number of expected balance changes",
        websiteDescription:
          "The number of accounts is different than the number of expected balance changes",
      },
      FIRST_ARGUMENT_MUST_BE_A_CONTRACT_INSTANCE: {
        number: 70015,
        messageTemplate: `The first argument of "{method}" must be the contract instance of the token`,
        websiteTitle: "First argument must be a contract instance",
        websiteDescription: "First argument must be a contract instance",
      },
      CONTRACT_IS_NOT_AN_ERC20_TOKEN: {
        number: 70016,
        messageTemplate: `The given contract instance is not an ERC20 token`,
        websiteTitle: "Given contract instance is not an ERC20 token",
        websiteDescription: "Given contract instance is not an ERC20 token",
      },
      INVALID_TRANSACTION: {
        number: 70017,
        messageTemplate: '"{transaction}" is not a valid transaction',
        websiteTitle: "Invalid transaction",
        websiteDescription: "Invalid transaction",
      },
      CONTRACT_TARGET_MUST_BE_A_STRING: {
        number: 70018,
        messageTemplate: "The contract target should be a string",
        websiteTitle: "Contract target must be a string",
        websiteDescription: "Contract target must be a string",
      },
      EMIT_EXPECTS_TWO_ARGUMENTS: {
        number: 70019,
        messageTemplate:
          "The .emit matcher expects two arguments: the contract and the event name. Arguments should be asserted with the .withArgs helper.",
        websiteTitle: "Invalid arguments length for the .emit matcher",
        websiteDescription: "Invalid arguments length for the .emit matcher",
      },
      CONTRACT_RUNNER_PROVIDER_NOT_NULL: {
        number: 70020,
        messageTemplate: "contract.runner.provider shouldn't be null",
        websiteTitle: "Contract runner's provider shouldn't be null",
        websiteDescription: "Contract runner's provider shouldn't be null",
      },
      WITH_ARGS_CANNOT_BE_COMBINED_WITH_NOT: {
        number: 70021,
        messageTemplate: "Do not combine .not. with .withArgs()",
        websiteTitle: "Do not combine .not. with .withArgs()",
        websiteDescription: "Do not combine .not. with .withArgs()",
      },
      WITH_ARGS_WRONG_COMBINATION: {
        number: 70022,
        messageTemplate:
          "withArgs can only be used in combination with a previous .emit or .revertedWithCustomError assertion",
        websiteTitle:
          "withArgs can only be used in combination with a previous .emit or .revertedWithCustomError assertion",
        websiteDescription:
          "withArgs can only be used in combination with a previous .emit or .revertedWithCustomError assertion",
      },
      WITH_ARGS_COMBINED_WITH_INCOMPATIBLE_ASSERTIONS: {
        number: 70023,
        messageTemplate:
          "withArgs called with both .emit and .revertedWithCustomError, but these assertions cannot be combined",
        websiteTitle:
          "withArgs called with both .emit and .revertedWithCustomError, but these assertions cannot be combined",
        websiteDescription:
          "withArgs called with both .emit and .revertedWithCustomError, but these assertions cannot be combined",
      },
      DEPRECATED_REVERTED_MATCHER: {
        number: 70024,
        messageTemplate:
          "The .reverted matcher has been deprecated. Use .revert(ethers) instead.",
        websiteTitle: "Deprecated `reverted` matcher",
        websiteDescription:
          "The `.reverted` matcher was deprecated and you should use `.revert(ethers)` instead.",
      },
    },
  },
  HARDHAT_VERIFY: {
    GENERAL: {
      NETWORK_NOT_SUPPORTED: {
        number: 80000,
        messageTemplate: `The network "{networkName}" with chain id "{chainId}" is not supported.`,
        websiteTitle: "Network not supported",
        websiteDescription: `The network is not supported by hardhat-verify. To see the list of supported networks, run:

\`\`\`sh
npx hardhat verify --list-networks
\`\`\`

To add support for a new network, see https://hardhat.org/verify-custom-networks`,
      },
      EXPLORER_REQUEST_FAILED: {
        number: 80001,
        messageTemplate: `The request to {url} failed with the message "{errorMessage}". This error comes from {name}, not Hardhat.`,
        websiteTitle: "Explorer request failed",
        websiteDescription: `The request to the explorer failed.

- Verify that the URL is correct.
- Ensure the service is up and reachable.
- Check your network connection and try again.`,
      },
      EXPLORER_REQUEST_STATUS_CODE_ERROR: {
        number: 80002,
        messageTemplate: `The request to {url} returned a non-success status code {statusCode}: "{errorMessage}". (This response comes from {name}, not Hardhat.)`,
        websiteTitle: "Explorer request status code error",
        websiteDescription: `The request to the explorer returned a non-success status code.

- Verify that the URL is correct.
- Ensure the service is up and reachable.
- Check your network connection and try again.`,
      },
      SOLC_VERSION_NOT_SUPPORTED: {
        number: 80003,
        messageTemplate: `The following Solidity compiler versions are not supported by the Etherscan API: {unsupportedSolcVersions}.`,
        websiteTitle: "Unsupported solidity compiler version",
        websiteDescription: `The specified Solidity compiler version is not supported by the Etherscan API. Only versions 0.4.11 and above are supported.
For a full list of supported versions, visit: https://etherscan.io/solcversions`,
      },
      DEPLOYED_BYTECODE_NOT_FOUND: {
        number: 80004,
        messageTemplate: `No bytecode found at address "{address}". Is the contract deployed on the "{networkName}" network?`,
        websiteTitle: "Deployed bytecode not found",
        websiteDescription: `No bytecode was found at the specified address. This usually means the contract is not deployed or was deployed to a different network.
Please verify the address and selected network, and try again.`,
      },
      SOLC_VERSION_MISMATCH: {
        number: 80005,
        messageTemplate: `The contract deployed to the "{networkName}" network was compiled with Solidity {deployedSolcVersion}, but the configured compiler {configuredSolcVersionSummary}.`,
        websiteTitle: "Compiler version mismatch",
        websiteDescription: `The Solidity compiler version used to compile the deployed contract does not match any of the versions configured in your Hardhat project.

This mismatch may indicate:

- You're not on the same commit that was used to deploy the contract.
- The compiler version in your Hardhat config is incorrect.
- The address provided is not the deployed contract.
- The selected network is incorrect.`,
      },
      CONTRACT_NOT_FOUND: {
        number: 80006,
        messageTemplate: `The contract "{contract}" is not present in your project's artifacts.`,
        websiteTitle: "Contract not found",
        websiteDescription: `The specified contract is not present in your project's artifacts. Please ensure the contract is compiled and the name is correct.`,
      },
      BUILD_INFO_NOT_FOUND: {
        number: 80007,
        messageTemplate: `The contract "{contract}" is present in your project, but its build info is missing.`,
        websiteTitle: "Build info not found",
        websiteDescription: `The specified contract is present in your project, but its build info is missing. Please ensure the contract is compiled by Hardhat and that it is written in Solidity.`,
      },
      BUILD_INFO_SOLC_VERSION_MISMATCH: {
        number: 80008,
        messageTemplate: `The contract "{contract}" build info specifies Solidity {buildInfoSolcVersion}, but the deployed bytecode on the "{networkName}" network indicates {versionDetails}.`,
        websiteTitle: "Build info compiler version mismatch",
        websiteDescription: `The compiler version in the build info does not match the version encoded in the deployed bytecode.
Possible causes:

- Compiler settings were changed after deployment.
- The contract address is incorrect.
- The selected network is incorrect.`,
      },
      DEPLOYED_BYTECODE_MISMATCH: {
        number: 80009,
        messageTemplate: `The address contains a contract whose bytecode does not match {contractDescription}.`,
        websiteTitle: "Deployed bytecode mismatch",
        websiteDescription: `The bytecode at the specified address did not match the expected contract.

Possible causes:

- Your artifacts are outdated or missing; try running \`npx hardhat compile --force --buildProfile production\`.
- The contract code was modified after deployment.
- Compiler settings (optimizer, EVM version, etc.) changed after deployment.
- The provided address is incorrect.
- The selected network is incorrect.`,
      },
      DEPLOYED_BYTECODE_MULTIPLE_MATCHES: {
        number: 80010,
        messageTemplate: `More than one contract matches the deployed bytecode:
{fqnList}

Specify the exact contract using the \`--contract\` flag.`,
        websiteTitle: "Multiple contract matches",
        websiteDescription: `The deployed bytecode matches multiple compiled contracts. Specify the exact contract using the \`--contract\` flag. For example:

\`\`\`sh
npx hardhat verify --contract contracts/Example.sol:ExampleContract <other args>
\`\`\`
`,
      },
      INVALID_LIBRARY_ADDRESS: {
        number: 80011,
        messageTemplate: `The library "{library}" provided for the contract "{contract}" has an invalid address: "{address}".`,
        websiteTitle: "Invalid library address",
        websiteDescription: `The address provided for a linked library is invalid. Please make sure the address is a valid Ethereum address.`,
      },
      UNUSED_LIBRARY: {
        number: 80012,
        messageTemplate: `The library "{library}" provided for the contract "{contract}" is not used by the contract.

{suggestion}`,
        websiteTitle: "Library not found in contract",
        websiteDescription: `A library was specified using the "--libraries" option, but the selected contract does not use it.

If the contract uses external libraries, verify that the provided name matches the fully qualified name (FQN) of one of them, such as:

\`\`\`
  contracts/Math.sol:SafeMath
\`\`\`
`,
      },
      LIBRARY_MULTIPLE_MATCHES: {
        number: 80013,
        messageTemplate: `The library "{library}" provided for the contract "{contract}" is ambiguous.
It matches multiple libraries:
{fqnList}

To fix this, specify one of these fully qualified library names and try again.`,
        websiteTitle: "Library name is ambiguous",
        websiteDescription: `The specified library name matches multiple libraries used by the contract.

To resolve the ambiguity, provide the fully qualified library name in the format:

\`\`\`
  path/to/LibraryFile.sol:LibraryName
\`\`\`
`,
      },
      DUPLICATED_LIBRARY: {
        number: 80014,
        messageTemplate: `The library name "{library}" and its fully qualified name "{libraryFqn}" refer to the same library.

To fix this, remove one of them and try again.`,
        websiteTitle: "Duplicated library entry",
        websiteDescription: `The same library was specified more than once using both its short name and fully qualified name (FQN) in the \`--libraries\` option.

Only one form should be used for each library. Remove one of the entries and try again.`,
      },
      LIBRARY_ADDRESSES_MISMATCH: {
        number: 80015,
        messageTemplate: `The following detected library addresses differ from those you provided:
{conflictList}

You can either fix these addresses in your libraries, or remove them to let the plugin autodetect them.`,
        websiteTitle: "Library address mismatch",
        websiteDescription: `Some libraries have conflicting addresses between what you provided and what was detected in the deployed bytecode.

Please ensure each library address is correct. You can remove entries from your input to use autodetection instead.`,
      },
      MISSING_LIBRARY_ADDRESSES: {
        number: 80016,
        messageTemplate: `The contract "{contract}" has one or more library addresses that cannot be detected from the deployed bytecode.
This can occur if a library is only used in the contract's constructor. The missing libraries are:
{missingList}`,
        websiteTitle: "Missing library addresses",
        websiteDescription: `One or more libraries required by the contract could not be detected from the deployed bytecode.

This usually happens when a library is only referenced in the contract's constructor. To resolve this, provide the missing library addresses using the "--libraries" option.`,
      },
      INVALID_CONSTRUCTOR_ARGUMENT_TYPE: {
        number: 80017,
        messageTemplate: `The value "{value}" for a constructor parameter cannot be encoded.
Reason: {reason}.`,
        websiteTitle: "Invalid constructor argument type",
        websiteDescription: `One of the arguments passed to the contract's constructor has an invalid JavaScript type.

This error occurs when you supply a value whose runtime type doesn't match the expected Solidity type. For example, you must pass a JS string for a Solidity string parameter.

Please verify that each constructor argument is the correct JS type.`,
      },
      INVALID_CONSTRUCTOR_ARGUMENTS_LENGTH: {
        number: 80018,
        messageTemplate: `The constructor for "{contract}" has {requiredArgs} parameters but {providedArgs} arguments were provided instead.`,
        websiteTitle: "Invalid constructor argument count",
        websiteDescription: `The number of arguments provided to the contract's constructor doesn't match the number of parameters defined in its ABI.

This error occurs when you supply a different number of arguments than the constructor expects. For example, if the constructor expects two parameters but you provided three.

Please verify that you pass the exact number of arguments required by the constructor.`,
      },
      CONSTRUCTOR_ARGUMENT_OVERFLOW: {
        number: 80019,
        messageTemplate: `The value "{value}" is out of bounds for its Solidity type and cannot be encoded.`,
        websiteTitle: "Constructor argument value out of bounds",
        websiteDescription: `One of the arguments passed to the contract's constructor is outside the allowed range for its Solidity type (for example, passing 256 to a uint8 parameter).

This error occurs when a value exceeds the maximum or minimum allowed for the specified Solidity type.

Please ensure all argument values fit within the valid range for their respective Solidity types.`,
      },
      CONSTRUCTOR_ARGUMENTS_ENCODING_FAILED: {
        number: 80020,
        messageTemplate: `The constructor arguments for "{contract}" could not be encoded. Reason: {reason}.`,
        websiteTitle: "Constructor arguments encoding failed",
        websiteDescription: `The constructor arguments provided for the contract could not be encoded correctly.
Please review the provided arguments and ensure they match the expected arguments defined in the contract's ABI.`,
      },
      CONTRACT_VERIFICATION_MISSING_BYTECODE: {
        number: 80021,
        messageTemplate: `The request to {url} failed because the address "{address}" does not have bytecode.`,
        websiteTitle: "Missing bytecode at address",
        websiteDescription: `The explorer responded that the specified address does not contain bytecode. This usually means the contract was deployed recently and the explorer's backend has not yet indexed it.

Please wait a short time (e.g., 30-60 seconds) and try again. If you're running this from a script, wait for at least five confirmations before verifying.`,
      },
      CONTRACT_ALREADY_VERIFIED: {
        number: 80022,
        messageTemplate: `The contract "{contract}" at address "{address}" is already verified.`,
        websiteTitle: "Contract already verified",
        websiteDescription: `The block explorer responded that the contract is already verified.

This typically occurs if you used the "--force" flag and the explorer does not support re-verification, or if the contract was previously verified with a full match.`,
      },
      CONTRACT_VERIFICATION_REQUEST_FAILED: {
        number: 80023,
        messageTemplate: `The contract verification request failed: "{message}".`,
        websiteTitle: "Contract verification request failed",
        websiteDescription: `The block explorer returned an error when attempting to verify the contract's source code.

Please check the returned message for details.`,
      },
      CONTRACT_VERIFICATION_STATUS_POLLING_FAILED: {
        number: 80024,
        messageTemplate: `The contract verification status polling encountered an error: "{message}". Verification may still succeed.`,
        websiteTitle: "Contract verification status polling failed",
        websiteDescription:
          "The block explorer returned a failure status when checking the verification status. Verification may still succeed; please check manually.",
      },
      CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE: {
        number: 80025,
        messageTemplate: `The block explorer API returned an unexpected message: "{message}". Please report this issue to the Hardhat team.`,
        shouldBeReported: true,
        websiteTitle: "Unexpected API response during contract verification",
        websiteDescription: `The block explorer API returned a message that doesn't match the expected format. This may indicate a change in the API or an issue with the request.

Please report this issue to the Hardhat team.`,
      },
      CONTRACT_VERIFICATION_FAILED: {
        number: 80026,
        messageTemplate: `The contract verification failed.
Reason: "{reason}".
{librariesWarning}`,
        websiteTitle: "Contract verification failed",
        websiteDescription: `Unable to verify the contract on the block explorer.

If your contract uses libraries whose addresses cannot be detected automatically, make sure you are providing the correct address for each undetectable library.`,
      },
      BLOCK_EXPLORER_NOT_CONFIGURED: {
        number: 80027,
        messageTemplate:
          "No {verificationProvider} block explorer is configured for the {chainId} chain in the chain descriptors.",
        websiteTitle: "Block explorer not configured",
        websiteDescription: `
Block explorer information is missing in your chain descriptor configuration.

To enable contract verification, add an entry for the verification provider in the blockExplorers field of the relevant chain descriptor.
You can override the default chain descriptor by providing your own chainDescriptors object in the Hardhat config, with the following structure:

\`\`\`
chainDescriptors: {
  <chainId>: {
    name: <name>,
    blockExplorers: {
      blockscout: { name: "Blockscout", url: <blockscout-url> apiUrl: <blockscout-api-url> };
      etherscan: { name: "Etherscan", url: <etherscan-url> apiUrl: <etherscan-api-url> };
    }
  }
}
\`\`\`
`,
      },
      ADDRESS_NOT_A_CONTRACT: {
        number: 80028,
        messageTemplate: `{verificationProvider} responded that the address "{address}" does not contain a contract. This usually means the address is incorrect, the contract was not deployed on the selected network, or there is a temporary issue with the block explorer not updating its index.`,
        websiteTitle: "Address is not a contract",
        websiteDescription: `The block explorer responded that the address does not contain a contract. This usually means the address is incorrect, the contract was not deployed on the selected network, or there is a temporary issue with the block explorer not updating its index.
Please verify the address and network, and try again later if necessary.`,
      },
      EXPLORER_API_KEY_EMPTY: {
        number: 80029,
        messageTemplate: `The {verificationProvider} API key is empty.`,
        websiteTitle: "Block explorer API key is empty",
        websiteDescription: `The provided API key for the block explorer is empty. This can happen in the following cases:

- No "apiKey" field is configured in the hardhat config.
- The "apiKey" is explicitly set to an empty string in the Hardhat config.
- The "apiKey" is assigned to a config variable that resolves to an empty string at runtime.

To resolve this, set a valid non-empty API key in your Hardhat config, then try again.`,
      },
    },
    VALIDATION: {
      INVALID_ADDRESS: {
        number: 80100,
        messageTemplate: `"{value}" is not a valid address`,
        websiteTitle: "Invalid address",
        websiteDescription: "The value is not a valid address",
      },
      MUTUALLY_EXCLUSIVE_CONSTRUCTOR_ARGS: {
        number: 80101,
        messageTemplate:
          "The parameters constructorArgs and constructorArgsPath are mutually exclusive.",
        websiteTitle: "Mutually exclusive constructor arguments",
        websiteDescription:
          "The parameters constructorArgs and constructorArgsPath are mutually exclusive. Please provide only one of them.",
      },
      INVALID_CONSTRUCTOR_ARGS_MODULE_EXPORT: {
        number: 80102,
        messageTemplate: `The module specified by "{constructorArgsPath}" must default export an array of constructor arguments.`,
        websiteTitle: "Invalid constructor arguments module",
        websiteDescription: `The module specified by the constructorArgsPath parameter must default export an array of constructor arguments.

Example:

\`\`\`ts
export default ["arg1", "arg2", ...];
\`\`\`
`,
      },
      MODULE_NOT_FOUND: {
        number: 80103,
        messageTemplate: `The module specified by "{modulePath}" could not be found.`,
        websiteTitle: "Module not found",
        websiteDescription:
          "The specified module could not be found. Please check the path and try again.",
      },
      MODULE_SYNTAX_ERROR: {
        number: 80104,
        messageTemplate: `The module specified by "{modulePath}" has a syntax error: {errorMessage}`,
        websiteTitle: "Module syntax error",
        websiteDescription:
          "The specified module has a syntax error. Please fix the error and try again.",
      },
      IMPORT_MODULE_FAILED: {
        number: 80105,
        messageTemplate: `The module specified by "{modulePath}" could not be imported: {errorMessage}`,
        websiteTitle: "Import module failed",
        websiteDescription: "The specified module could not be imported.",
      },
      INVALID_LIBRARIES_MODULE_EXPORT: {
        number: 80106,
        messageTemplate: `The module specified by "{librariesPath}" must default export a record of libraries.`,
        websiteTitle: "Invalid libraries module",
        websiteDescription: `The module specified by the librariesPath parameter must default export a record of libraries.

Example:

\`\`\`ts
export default { lib1: "0x...", lib2: "0x...", ... };
\`\`\``,
      },
      INVALID_VERIFICATION_PROVIDER: {
        number: 80107,
        messageTemplate: `The verification provider "{verificationProvider}" is not supported. Supported providers are: {supportedVerificationProviders}.`,
        websiteTitle: "Invalid verification provider",
        websiteDescription:
          "The specified verification provider is not supported. Please use one of the supported providers.",
      },
    },
  },
  HARDHAT_LEDGER: {
    GENERAL: {
      INVALID_LEDGER_ADDRESS: {
        number: 90000,
        messageTemplate: `The ledger address "{address}" in the Hardhat configuration file is invalid.`,
        websiteTitle: "Invalid ledger address",
        websiteDescription: `The ledger address in the Hardhat configuration file is invalid.`,
      },
      UNOWNED_LEDGER_ADDRESS: {
        number: 90001,
        messageTemplate: `Transaction attempted from address "{address}", which is not listed in the Hardhat configuration file.`,
        websiteTitle: "Unknown ledger address",
        websiteDescription: `Transaction attempted from an address which is not listed in the Hardhat configuration file.`,
      },
      CONNECTION_ERROR: {
        number: 90002,
        messageTemplate: `There was an error trying to establish a connection to the Ledger wallet: {error}.{transportId}

Make sure your Ledger is connected and unlocked, and that the Ethereum app is open.`,
        websiteTitle: "Ledger connection error",
        websiteDescription: `There was an error trying to establish a connection to the Ledger wallet.

Make sure your Ledger is connected and unlocked, and that the Ethereum app is open.`,
      },
      ERROR_WHILE_DERIVING_PATH: {
        number: 90003,
        messageTemplate: `There was an error trying to derive path "{path}": "{message}". The wallet might be connected but locked or in the wrong app.`,
        websiteTitle: "Error while deriving path",
        websiteDescription: `There was an error trying to derivate the path. The wallet might be connected but locked or in the wrong app.`,
      },
      CANNOT_FIND_VALID_DERIVATION_PATH: {
        number: 90004,
        messageTemplate: `Cannot find a valid derivation path for address "{address}". Paths from {pathStart} to {pathEnd} were searched.`,
        websiteTitle: "Cannot find valid derivation path",
        websiteDescription: `Cannot find a valid derivation path for the address`,
      },
      PERSONAL_SIGN_MISSING_ADDRESS_PARAM: {
        number: 90005,
        messageTemplate: `Missing address parameter when calling personal_sign.`,
        websiteTitle: "Missing address parameter when calling personal_sign",
        websiteDescription: `You called "personal_sign" with incorrect parameters.

Please check that you are sending an "address" parameter.`,
      },
      ETH_SIGN_MISSING_DATA_PARAM: {
        number: 90006,
        messageTemplate: `Missing "data" param when calling eth_sign.`,
        websiteTitle: `Missing "data" param when calling eth_sign.`,
        websiteDescription: `You called "eth_sign" with incorrect parameters.

Please check that you are sending a "data" parameter.`,
      },
      ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM: {
        number: 90007,
        messageTemplate: `Invalid "data" param when calling eth_signTypedData_v4.`,
        websiteTitle: `Invalid "data" param when calling eth_signTypedData_v4.`,
        websiteDescription: `You called "eth_signTypedData_v4" with incorrect parameters.

Please check that you are sending a "data" parameter with a JSON string or object conforming to EIP712 TypedData schema.`,
      },
      LOCKED_DEVICE: {
        number: 90008,
        messageTemplate: `The ledger device is locked. Please unlock it and try again.`,
        websiteTitle: `The ledger device is locked`,
        websiteDescription: `The ledger device is locked. Please unlock it and try again.`,
      },
      EIP_7702_TX_CURRENTLY_NOT_SUPPORTED: {
        number: 90009,
        messageTemplate: `EIP-7702 transactions are currently not supported.`,
        websiteTitle: `EIP-7702 transactions are currently not supported`,
        websiteDescription: `EIP-7702 transactions are currently not supported.`,
      },
    },
  },
} as const;
