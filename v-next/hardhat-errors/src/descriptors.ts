/**
 * A description of a kind of error that Hardhat can throw.
 */
export interface ErrorDescriptor {
  /**
   * The error number, which should be unique.
   */
  number: number;

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
    websiteTitle: "Hardhat Core",
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
      INVALID_ACTION_URL: {
        number: 411,
        messageTemplate:
          'Unable to import the action specified by task "{task}" from the module "{action}"',
        websiteTitle: "Invalid action URL",
        websiteDescription:
          "The action URL is invalid. Please ensure that the URL is correct.",
      },
      INVALID_ACTION: {
        number: 412,
        messageTemplate:
          'The action resolved from "{action}" in task "{task}" is not a function',
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
        websiteDescription: `The network manager only supports the network types 'http' and 'edr'.`,
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
      RESOLVING_INCORRECT_FILE_AS_PROJECT_FILE: {
        number: 900,
        shouldBeReported: true,
        messageTemplate: `File "{file}" is being resolved as a project file, but it's not part of the project.`,
        websiteTitle: "Solidity project file is outside the project",
        websiteDescription: `Tried to resolve a file as a project file, but it's not part of the project.`,
      },
      RESOLVING_NONEXISTENT_PROJECT_FILE: {
        number: 901,
        shouldBeReported: true,
        messageTemplate: `File "{file}" is being resolved as a project file, but it doesn't exist.`,
        websiteTitle: "Solidity project file doesn't exist",
        websiteDescription: `Tried to resolve a file as a project file, but it doesn't exist.`,
      },
      IMPORTED_FILE_DOESNT_EXIST: {
        number: 902,
        messageTemplate: `The import "{importPath} from "{from}" doesn't exist.`,
        websiteTitle: "Imported file doesn't exist",
        websiteDescription: `An imported file doesn't exist.`,
      },
      IMPORTED_FILE_WITH_INCORRECT_CASING: {
        number: 903,
        messageTemplate:
          'The import "{importPath} from "{from}" exists, but its casing is incorrect. The correct casing is "{correctCasing}".',
        websiteTitle: "Imported file with incorrect casing",
        websiteDescription: `Hardhat enforces that you import your files with the correct casing (as stored in the filesystem).

This error is thrown when you import a file with the wrong casing under a case insensitve filesystem.`,
      },
      IMPORTED_PACKAGE_EXPORTS_FILE_WITH_INCORRECT_CASING: {
        number: 904,
        messageTemplate:
          'The import "{importPath} from "{from}" exists, but its casing is incorrect.',
        websiteTitle: "Imported file with incorrect casing",
        websiteDescription: `Hardhat enforces that you import your files with the correct casing (as stored in the filesystem).

This error is thrown when you import a file with the wrong casing under a case insensitve filesystem.`,
      },
      NPM_DEPEDNDENCY_NOT_INSTALLED: {
        number: 905,
        messageTemplate:
          'The npm package "{packageName}" isn\'t installed in the {from}.',
        websiteTitle: "Uninstalled npm dependency",
        websiteDescription: `Trying to use an npm package as a solidity dependency, but it's not installed.`,
      },
      IMPORTED_NPM_DEPENDENCY_NOT_INSTALLED: {
        number: 906,
        messageTemplate:
          'The import "{importPath}" from "{from}" is trying to use an uninstalled npm dependency.',
        websiteTitle: "Uninstalled npm solidity dependency",
        websiteDescription: `One of your files is traying to import a dependency using npm, but it hasn't been installed`,
      },
      USER_REMAPPING_WITH_NPM_CONTEXT: {
        number: 907,
        messageTemplate:
          'The remapping "{remapping}" has a context starting with "npm/", which is forbidden. Hardhat doesn\'t allow changing the behaviour of npm package\'s imports.',
        websiteTitle: "Remapping imports in npm packages is not allowed",
        websiteDescription: `This error happened because you are trying to change how the imports within an npm package, which is not allowed.

While Hardhat supports user-defined remappings, it doesn't support remapping the behavior of npm packages to ensure that everything what's imported via npm uses the same npm resolution logic.`,
      },
      REMAPPING_WITH_INVALID_SYNTAX: {
        number: 908,
        messageTemplate: `The remapping "{remapping}" is invalid.`,
        websiteTitle: "Invalid remapping",
        websiteDescription: `You are trying to set a user remapping, but it's syntax is invalid.

Please double check your remmpaings' syntax.`,
      },
      REMAPPING_TO_UNINSTALLED_PACKAGE: {
        number: 909,
        messageTemplate: `The remapping "{remapping}" is trying to use the npm package "{package}", which is not installed`,
        websiteTitle: "Remapping into an uninstaleld npm package",
        websiteDescription: `You are trying to set a user remapping that uses an npm pacakge as target, but it's not installed.

Please make sure to install the package or fix the remapping.`,
      },
      REMAPPING_NPM_PACKAGE_AS_MONOREPO: {
        number: 910,
        messageTemplate: `The remapping "{remapping}" targets the npm pacakge "{pacakge}" as if it were part of this repository, but version "{version}" is installed instead`,
        websiteTitle:
          "Remapping into a monorepo package but found an npm package instead",
        websiteDescription: `You are trying to set a remapping setting a monorepo package as target, but Hardhat found the pacakge to be installed from the npm regristry instead.`,
      },
      REMAPPING_HARDHAT_PROJECT_AS_MONOREPO_PACKAGE: {
        number: 911,
        messageTemplate: `The remapping "{remapping}" is trying to set the npm package "{package}" as target, but that's the project is the Hardhat project, so it shouldn't be remapped through npm/, but as internal project remappings.`,
        websiteTitle: `Remapping into the project using npm`,
        websiteDescription: `You are trying to set a remapping whose target uses the npm/ syntax, but is within your Hardhat project.

Please don't use npm/... as target, but use normal internal project remapping istead.`,
      },
      REMAPPING_INCORRECT_VERSION: {
        number: 912,
        messageTemplate: `The remapping "{remapping}" is trying to set the npm package "{package}" version "{expectedVersion}" as target, but found version "{actualVersion}" instead.`,
        websiteTitle: `Remapping into incorrect npm package version`,
        websiteDescription: `You are trying to set a remapping into an npm package, but the version that you are using is not the currently installed one.

Please change your remapping to match the installed version, or installed the correct one.`,
      },
      INVALID_NPM_IMPORT: {
        number: 913,
        messageTemplate: `The import "{importPath}" in "{from}" is treated as an npm import as it's first directory doesn't exist in your project, but it's syntax is not that of a valid npm import either.`,
        websiteTitle: `Invalid npm import`,
        websiteDescription: `You are trying to import a file that is not a valid npm import. Please double check that you are using the correct syntax.`,
      },
      ILLEGAL_PACKAGE_IMPORT: {
        number: 914,
        messageTemplate: `The import "{importPath}" in "{from}" is not a legal import as it's trying to import a file outside of its package.`,
        websiteTitle: `Illegal package import`,
        websiteDescription: `One of your npm packages has a Solidity file that is trying to import a file outside of its package using a relative import. This is disabled for security reasons.`,
      },
      ILEGALL_PROJECT_IMPORT: {
        number: 915,
        messageTemplate: `The import "{importPath}" in "{from}" is not a legal import as it's trying to import a file outside of the project.`,
        websiteTitle: `Illegal project import`,
        websiteDescription: `One of your Solidity files is trying to import a file outside of the Hardhat project using a relative import. This is disabled for security reasons.`,
      },
      ILLEGAL_PROJECT_IMPORT_AFTER_REMAPPING: {
        number: 916,
        messageTemplate: `Applying the remapping "{remapping}" to the import "{importPath}" from "{from}" results in an invalid import "{remappedDirectImport}", as it's not a local file. If you are trying to remap into an npm module use the npm/ syntax instead.`,
        websiteTitle: `Illegal project import after remapping`,
        websiteDescription: `One of your Solidity files has an import which after applying a user remapping becomes an illegal import, as it tries to import a file outside of the project. This is disabled for security reasons.

If you are trying to remap into an npm module use the npm/ syntax instead.`,
      },
      IMPORT_PATH_WITH_WINDOWS_SEPARATOR: {
        number: 917,
        messageTemplate: `The import "{importPath}" in "{from}" is not a valid import as it contains a Windows path separator.`,
        websiteTitle: `Import path with Windows path separator`,
        websiteDescription: `One of your Solidity files is trying to import a file with a Windows path separator, and this is not supported. Please use a Unix-style path instead.`,
      },
      INVALID_SOLC_VERSION: {
        number: 918,
        messageTemplate: `Solidity version {version} is invalid or hasn't been released yet.

If you are certain it has been released, run "npx hardhat clean --global" and try again`,
        websiteTitle: "Invalid or unreleased `solc` version",
        websiteDescription: `The Solidity version in your config is invalid or hasn't been released yet.

If you are certain it has been released, run \`npx hardhat clean --global\` and try again.`,
      },
      RESOLVE_NPM_FILE_WITH_INVALID_FORMAT: {
        number: 919,
        messageTemplate: `Couldn't resolve the npm file "{module}" because it has an invalid format.

Make sure that you are providing valid npm file paths (e.g. package/File.sol) in your config and programatically.`,
        websiteTitle: "Resolving invalid npm file",
        websiteDescription: `Tried to resolve an npm file directly (i.e. not imported by another file) but its format is invalid.

This can happen if you setting npm files to be compiled as local files, with invalid file paths, or by misusing the solidity build system.`,
      },
      RESOLVE_NPM_FILE_CLASHES_WITH_LOCAL_FILES: {
        number: 920,
        shouldBeReported: true,
        messageTemplate: `You are tying to resolve the npm file "{module}", for example to compile it as a local one, but it can clash with your project as the "{directory}" directory is present in your project.

Please try renaming the directory.`,
        websiteTitle: "Resolution of npm file clashes with local files",
        websiteDescription: `You are tying to resolve an npm file, for example to compile it as a local one, but it can clash with your project files.`,
      },
      RESOLVE_NON_EXISTENT_NPM_ROOT: {
        number: 921,
        messageTemplate: `You are tying to compile the npm file "{module}", but it doesn't exist within its package.`,
        websiteTitle: "Resolution of non-existent npm file",
        websiteDescription: `You are tying to resolve an npm file that doesn't exist within its package.`,
      },
      RESOLVE_WRONG_CASING_NPM_ROOT: {
        number: 922,
        messageTemplate: `You are tying to compile the npm file "{module}", its casing is incorrect. Please double check it in your config.`,
        websiteTitle: "Resolution of npm file with incorrect casing",
        websiteDescription: `You are tying to resolve an npm file whose casing is incorrect.`,
      },
      DOWNLOAD_FAILED: {
        number: 923,
        messageTemplate:
          "Couldn't download compiler version {remoteVersion}. Please check your internet connection and try again.",
        websiteTitle: "`solc` download failed",
        websiteDescription: `Couldn't download \`solc\`.

Please check your internet connection and try again.`,
      },
      VERSION_LIST_DOWNLOAD_FAILED: {
        number: 924,
        messageTemplate:
          "Couldn't download compiler version list. Please check your internet connection and try again.",
        websiteTitle: "Couldn't obtain `solc` version list",
        websiteDescription: `Couldn't download \`solc\`'s version list.

Please check your internet connection and try again.`,
      },
      INVALID_DOWNLOAD: {
        number: 925,
        messageTemplate: `Couldn't download compiler version {remoteVersion}: Checksum verification failed.

Please check your internet connection and try again.

If this error persists, run "npx hardhat clean --global".`,
        websiteTitle: "Downloaded `solc` checksum verification failed",
        websiteDescription: `Hardhat downloaded a version of the Solidity compiler, and its checksum verification failed.

Please check your internet connection and try again.

If this error persists, run \`npx hardhat clean --global\`.`,
      },
      CANT_RUN_NATIVE_COMPILER: {
        number: 926,
        messageTemplate: `A native version of solc failed to run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
        websiteTitle: "Failed to run native solc",
        websiteDescription: `Hardhat successfully downloaded a native version of solc but it doesn't run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
      },
      CANT_RUN_SOLCJS_COMPILER: {
        number: 927,
        messageTemplate: `A wasm version of solc failed to run.

If this error persists, run "npx hardhat clean --global".`,
        websiteTitle: "Failed to run solcjs",
        websiteDescription: `Hardhat successfully downloaded a WASM version of solc but it doesn't run.

If you are running MacOS, try installing Apple Rosetta.

If this error persists, run "npx hardhat clean --global".`,
      },
      COMPILATION_JOB_CREATION_ERROR: {
        number: 928,
        messageTemplate: `Failed to create compilation job for file "{rootFilePath}" using the build profile "{buildProfile}".

{reason}`,
        websiteTitle: "Failed to create compilation job",
        websiteDescription: `Hardhat failed to create a compilation job for a file in your project.

This happens when your files require incompatible versions of solc or you haven't configured a version that works with them`,
      },
      BUILD_FAILED: {
        number: 929,
        messageTemplate: "Compilation failed",
        websiteTitle: "Compilation failed",
        websiteDescription: `Your smart contracts failed to compile.

Please check Hardhat's output for more details.`,
      },
      INVALID_SOLCJS_COMPILER: {
        number: 930,
        messageTemplate: `A wasm version of solc {version} is invalid. The compile function is not available.`,
        websiteTitle: "Invalid solcjs compiler",
        websiteDescription: `Hardhat successfully downloaded a WASM version of solc {version} but it is invalid. The compile function is missing.`,
      },
      RESOLVE_NOT_EXPORTED_NPM_FILE: {
        number: 931,
        messageTemplate: `You are tying to resolve the npm file "{module}", but it's not exported by its package`,
        websiteTitle: "Resolution of not-exported npm file",
        websiteDescription: `You are tying to resolve an npm file that is not exported by its package.`,
      },
      BUILD_PROFILE_NOT_FOUND: {
        number: 932,
        messageTemplate: `The build profile "{buildProfileName}" is not defined in your Hardhat config`,
        websiteTitle: "Build profile not defined",
        websiteDescription: `The build profile you are trying to use is not defined in your Hardhat config.`,
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
        messageTemplate: `The provided node network type "{networkType}" for network "{networkName}" is not recognized, only 'edr' is supported.`,
        websiteTitle: "Invalid node network type",
        websiteDescription: `The node only supports the 'edr' network type.`,
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
        websiteDescription: `The libray names clash with each other`,
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

import { someChain } from "viem/chains";
const client = await hre.viem.getPublicClient({
  chain: someChain,
  ...
});

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

const networkConnection = await hre.network.connect(...);
const walletClient = await networkConnection.viem.getWalletClient(address);

await networkConnection.viem.deployContract(contractName, constructorArgs, { walletClient });
await networkConnection.viem.sendDeploymentTransaction(contractName, constructorArgs, { walletClient });
await networkConnection.viem.getContractAt(contractName, address, { walletClient });`,
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
          "Invalid arguments length for the  .revertedWithCustomError matcher",
        websiteDescription:
          "Invalid arguments length for the  .revertedWithCustomError matcher",
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
    },
  },
} as const;
