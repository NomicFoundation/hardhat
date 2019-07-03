import { getClosestCallerPackage } from "../util/caller-package";
import { replaceAll } from "../util/strings";

const ERROR_PREFIX = "BDLR";

export interface ErrorDescription {
  number: number;
  message: string;
}

// For an explanation about these classes constructors go to:
// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work

export class BuidlerError extends Error {
  public readonly number: number;
  public readonly parent?: Error;

  constructor(
    errorDescription: ErrorDescription,
    parentError: Error,
    messageArguments?: { [variableName: string]: any }
  );
  constructor(
    errorDescription: ErrorDescription,
    messageArguments?: { [variableName: string]: any }
  );
  constructor(
    errorDescription: ErrorDescription,
    parentError: Error | { [variableName: string]: any } = {},
    messageArguments: { [variableName: string]: any } = {}
  ) {
    const prefix = ERROR_PREFIX + errorDescription.number.toString() + ": ";

    let formattedMessage: string;
    if (parentError instanceof Error) {
      formattedMessage = applyErrorMessageTemplate(
        errorDescription.message,
        messageArguments
      );
    } else {
      formattedMessage = applyErrorMessageTemplate(
        errorDescription.message,
        parentError
      );
    }

    super(prefix + formattedMessage);
    this.number = errorDescription.number;

    if (parentError instanceof Error) {
      this.parent = parentError;
    }

    Object.setPrototypeOf(this, BuidlerError.prototype);
  }
}

/**
 * This class is used to throw errors from buidler plugins.
 */
export class BuidlerPluginError extends Error {
  public readonly parent?: Error;
  public readonly pluginName: string;

  /**
   * Creates a BuidlerPluginError.
   *
   * @param pluginName The name of the plugin.
   * @param message An error message that will be shown to the user.
   * @param parent The error that causes this error to be thrown.
   */
  public constructor(pluginName: string, message: string, parent?: Error);

  /**
   * A DEPRECATED constructor that automatically obtains the caller package and
   * use it as plugin name.
   *
   * @deprecated Use the above constructor.
   *
   * @param message An error message that will be shown to the user.
   * @param parent The error that causes this error to be thrown.
   */
  public constructor(message: string, parent?: Error);

  public constructor(
    pluginNameOrMessage: string,
    messageOrParent?: string | Error,
    parent?: Error
  ) {
    if (typeof messageOrParent === "string") {
      super(messageOrParent);
      this.pluginName = pluginNameOrMessage;
      this.parent = parent;
    } else {
      super(pluginNameOrMessage);
      this.pluginName = getClosestCallerPackage()!;
      this.parent = messageOrParent;
    }

    Object.setPrototypeOf(this, BuidlerPluginError.prototype);
  }
}

/**
 * This function applies error messages templates like this:
 *
 *  - Template is a string which contains a variable tags. A variable tag is a
 *    a variable name surrounded by %. Eg: %plugin1%
 *  - A variable name is a string of alphanumeric ascii characters.
 *  - Every variable tag is replaced by its value.
 *  - %% is replaced by %.
 *  - Values can't contain variable tags.
 *  - If a variable is not present in the template, but present in the values
 *    object, an error is thrown.
 *
 * @param template The template string.
 * @param values A map of variable names to their values.
 */
export function applyErrorMessageTemplate(
  template: string,
  values: { [templateVar: string]: any }
): string {
  return _applyErrorMessageTemplate(template, values, false);
}

function _applyErrorMessageTemplate(
  template: string,
  values: { [templateVar: string]: any },
  isRecursiveCall: boolean
): string {
  if (!isRecursiveCall) {
    for (const variableName of Object.keys(values)) {
      if (variableName.match(/^[a-zA-Z][a-zA-Z0-9]*$/) === null) {
        throw new BuidlerError(ERRORS.INTERNAL.TEMPLATE_INVALID_VARIABLE_NAME, {
          variable: variableName
        });
      }

      const variableTag = `%${variableName}%`;

      if (!template.includes(variableTag)) {
        throw new BuidlerError(ERRORS.INTERNAL.TEMPLATE_VARIABLE_TAG_MISSING, {
          variable: variableName
        });
      }
    }
  }

  if (template.includes("%%")) {
    return template
      .split("%%")
      .map(part => _applyErrorMessageTemplate(part, values, true))
      .join("%");
  }

  for (const variableName of Object.keys(values)) {
    let value: string;

    if (values[variableName] === undefined) {
      value = "undefined";
    } else if (values[variableName] === null) {
      value = "null";
    } else {
      value = values[variableName].toString();
    }

    if (value === undefined) {
      value = "undefined";
    }

    const variableTag = `%${variableName}%`;

    if (value.match(/%([a-zA-Z][a-zA-Z0-9]*)?%/) !== null) {
      throw new BuidlerError(
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG,
        { variable: variableName }
      );
    }

    template = replaceAll(template, variableTag, value);
  }

  return template;
}

// This object contains the different BuidlerError descriptions. Numbers must
// be used once, and messages can contain util.format directives.
//
// The numbers are allocated as follow:
//    * 000-099: Errors not specific to a single Buidler module.
//    * 100-199: Errors related to the ethereum network connection its providers
//    * 200-299: Errors related to tasks definitions
//    * 300-399: Errors related to env variables and command line arguments
//    * 400-499: Errors related to smart contracts' dependencies resolution
//    * 500-599: Errors related to the solidity compiler
//    * 600-699: Errors related to the builtin tasks
//    * 700-799: Errors related to artifacts
//    * 800-899: Errors related to plugins
//    * 900-999: Internal errors that shouldn't leak
export const ERROR_RANGES: {
  [category in keyof (typeof ERRORS)]: { min: number; max: number };
} = {
  GENERAL: { min: 0, max: 99 },
  NETWORK: { min: 100, max: 199 },
  TASK_DEFINITIONS: { min: 200, max: 299 },
  ARGUMENTS: { min: 300, max: 399 },
  RESOLVER: { min: 400, max: 499 },
  SOLC: { min: 500, max: 599 },
  BUILTIN_TASKS: { min: 600, max: 699 },
  ARTIFACTS: { min: 700, max: 799 },
  PLUGINS: { min: 800, max: 899 },
  INTERNAL: { min: 900, max: 999 }
};

export const ERRORS = {
  GENERAL: {
    NOT_INSIDE_PROJECT: {
      number: 1,
      message: "You are not inside a buidler project."
    },
    INVALID_NODE_VERSION: {
      number: 2,
      message:
        "Buidler doesn't support your node version. It should be %requirement%."
    },
    UNSUPPORTED_OPERATION: {
      number: 3,
      message: "%operation% is not supported in Buidler."
    },
    CONTEXT_ALREADY_CREATED: {
      number: 4,
      message: "BuidlerContext is already created."
    },
    CONTEXT_NOT_CREATED: {
      number: 5,
      message: "BuidlerContext is not created."
    },
    CONTEXT_BRE_NOT_DEFINED: {
      number: 6,
      message: "BuidlerRuntimeEnvironment is not defined in the BuidlerContext."
    },
    CONTEXT_BRE_ALREADY_DEFINED: {
      number: 7,
      message: "BuidlerRuntime is already defined in the BuidlerContext"
    },
    INVALID_CONFIG: {
      number: 8,
      message: `There's one or more errors in your config file:

%errors%
  
To learn more about Buidler's configuration, please go to https://buidler.dev/documentation/#configuration`
    },
    LIB_IMPORTED_FROM_THE_CONFIG: {
      number: 9,
      message: `Error while loading Buidler's configuration.
You probably imported @nomiclabs/buidler instead of @nomiclabs/buidler/config`
    }
  },
  NETWORK: {
    CONFIG_NOT_FOUND: {
      number: 100,
      message: "Network %network% doesn't exist"
    },
    INVALID_GLOBAL_CHAIN_ID: {
      number: 101,
      message:
        "Buidler was set to use chain id %configChainId%, but connected to a chain with id %connectionChainId%."
    },
    /* DEPRECATED: This error only happened because of a misconception in Buidler */
    INVALID_TX_CHAIN_ID: {
      number: 102,
      message:
        "Trying to send a tx with chain id %txChainId%, but Buidler is connected to a chain with id %chainId%."
    },
    ETHSIGN_MISSING_DATA_PARAM: {
      number: 103,
      message: 'Missing "data" param when calling eth_sign.'
    },
    NOT_LOCAL_ACCOUNT: {
      number: 104,
      message:
        "Account %account% is not managed by the node you are connected to."
    },
    MISSING_TX_PARAM_TO_SIGN_LOCALLY: {
      number: 105,
      message: "Missing param %param% from a tx being signed locally."
    },
    NO_REMOTE_ACCOUNT_AVAILABLE: {
      number: 106,
      message:
        "No local account was set and there are accounts in the remote node."
    },
    INVALID_HD_PATH: {
      number: 107,
      message:
        "HD path %path% is invalid. Read about BIP32 to know about the valid forms."
    },
    INVALID_RPC_QUANTITY_VALUE: {
      number: 108,
      message:
        "Received invalid value %value% from/to the node's JSON-RPC, but a Quantity was expected."
    }
  },
  TASK_DEFINITIONS: {
    PARAM_AFTER_VARIADIC: {
      number: 200,
      message:
        "Could not set positional param %paramName% for task %taskName% because there is already a variadic positional param and it has to be the last positional one."
    },
    PARAM_ALREADY_DEFINED: {
      number: 201,
      message:
        "Could not set param %paramName% for task %taskName% because its name is already used."
    },
    PARAM_CLASHES_WITH_BUIDLER_PARAM: {
      number: 202,
      message:
        "Could not set param %paramName% for task %taskName% because its name is used as a param for Buidler."
    },
    MANDATORY_PARAM_AFTER_OPTIONAL: {
      number: 203,
      message:
        "Could not set param %paramName% for task %taskName% because it is mandatory and it was added after an optional positional param."
    },
    OVERRIDE_NO_PARAMS: {
      number: 204,
      message:
        "Redefinition of task %taskName% failed. You can't change param definitions in an overridden task."
    },
    ACTION_NOT_SET: {
      number: 205,
      message: "No action set for task %taskName%."
    },
    RUNSUPER_NOT_AVAILABLE: {
      number: 206,
      message:
        "Tried to call runSupper from a non-overridden definition of task %taskName%"
    },
    DEFAULT_VALUE_WRONG_TYPE: {
      number: 207,
      message:
        "Default value for param %paramName% of task %taskName% doesn't match the default one, try specifying it."
    },
    DEFAULT_IN_MANDATORY_PARAM: {
      number: 208,
      message:
        "Default value for param %paramName% of task %taskName% shouldn't be set."
    },
    INVALID_PARAM_NAME_CASING: {
      number: 209,
      message:
        "Invalid param name %paramName% in task %taskName%. Param names must be camelCase."
    }
  },
  ARGUMENTS: {
    INVALID_ENV_VAR_VALUE: {
      number: 300,
      message: "Invalid environment variable %varName%'s value: %value%"
    },
    INVALID_VALUE_FOR_TYPE: {
      number: 301,
      message: "Invalid value %value% for argument %name% of type %type%"
    },
    INVALID_INPUT_FILE: {
      number: 302,
      message:
        "Invalid argument %name%: File %value% doesn't exist or is not a readable file."
    },
    UNRECOGNIZED_TASK: {
      number: 303,
      message: "Unrecognized task %task%"
    },
    UNRECOGNIZED_COMMAND_LINE_ARG: {
      number: 304,
      message:
        "Unrecognised command line argument %argument%.\nNote that task arguments must come after the task name."
    },
    UNRECOGNIZED_PARAM_NAME: {
      number: 305,
      message: "Unrecognized param %param%"
    },
    MISSING_TASK_ARGUMENT: {
      number: 306,
      message: "Missing task argument %param%"
    },
    MISSING_POSITIONAL_ARG: {
      number: 307,
      message: "Missing positional argument %param%"
    },
    UNRECOGNIZED_POSITIONAL_ARG: {
      number: 308,
      message: "Unrecognized positional argument %argument%"
    },
    REPEATED_PARAM: {
      number: 309,
      message: "Repeated parameter %param%"
    },
    PARAM_NAME_INVALID_CASING: {
      number: 310,
      message: "Invalid param %param%. Command line params must be lowercase."
    },
    INVALID_JSON_ARGUMENT: {
      number: 311,
      message: "Error parsing JSON value for argument %param%: %error%"
    }
  },
  RESOLVER: {
    FILE_NOT_FOUND: {
      number: 400,
      message: "File %file% doesn't exist."
    },
    FILE_OUTSIDE_PROJECT: {
      number: 401,
      message: "File %file% is outside the project."
    },
    LIBRARY_FILE_NOT_LOCAL: {
      number: 402,
      message:
        "File %file% belongs to a library but was treated as a local one."
    },
    LIBRARY_NOT_INSTALLED: {
      number: 403,
      message: "Library %library% is not installed."
    },
    LIBRARY_FILE_NOT_FOUND: {
      number: 404,
      message: "File %file% doesn't exist."
    },
    ILLEGAL_IMPORT: {
      number: 405,
      message: "Illegal import %imported% from %from%"
    },
    FILE_OUTSIDE_LIB: {
      number: 406,
      message:
        "File %file% from %library% is resolved to a path outside of its library."
    },
    IMPORTED_FILE_NOT_FOUND: {
      number: 407,
      message: "File %imported%, imported from %from%, not found."
    }
  },
  SOLC: {
    INVALID_VERSION: {
      number: 500,
      message:
        "Solidity version %version% is invalid or hasn't been released yet."
    },
    DOWNLOAD_FAILED: {
      number: 501,
      message:
        "Couldn't download compiler version %remoteVersion%. Please check your connection or use local version %localVersion%"
    },
    VERSION_LIST_DOWNLOAD_FAILED: {
      number: 502,
      message:
        "Couldn't download compiler versions list. Please check your connection or use local version %localVersion%"
    },
    INVALID_DOWNLOAD: {
      number: 503,
      message:
        "Couldn't download compiler version %remoteVersion%. Checksum verification failed. Please check your connection or use local version %localVersion%"
    }
  },
  BUILTIN_TASKS: {
    COMPILE_FAILURE: {
      number: 600,
      message: "Compilation failed"
    },
    RUN_FILE_NOT_FOUND: {
      number: 601,
      message: "Script %script% doesn't exist."
    },
    RUN_SCRIPT_ERROR: {
      number: 602,
      message: "Error running script {%script%}: %error%"
    },
    FLATTEN_CYCLE: {
      number: 603,
      message: "buidler flatten doesn't support cyclic dependencies."
    }
  },
  ARTIFACTS: {
    NOT_FOUND: {
      number: 700,
      message: 'Artifact for contract "%contractName%" not found.'
    }
  },
  PLUGINS: {
    NOT_INSTALLED: {
      number: 800,
      message: "Plugin %plugin% is not installed."
    },
    MISSING_DEPENDENCY: {
      number: 801,
      message:
        "Plugin %plugin% requires %dependency% to be installed.\n%extraMessage%" +
        "Please run: npm install --save-dev%extraFlags% %dependency%@%versionSpec%"
    },
    DEPENDENCY_VERSION_MISMATCH: {
      number: 802,
      message:
        "Plugin %plugin% requires %dependency% version %versionSpec% but got %installedVersion%.\n%extraMessage%" +
        "If you haven't installed %dependency% manually, please run: npm install --save-dev%extraFlags% %dependency%@%versionSpec%\n" +
        "If you have installed %dependency% yourself, please reinstall it with a valid version."
    },
    OLD_STYLE_IMPORT_DETECTED: {
      number: 803,
      message:
        "You are trying to load %pluginNameText% with a require or import statement.\n" +
        'Please replace it with a call to usePlugin("%pluginNameCode%").'
    }
  },
  INTERNAL: {
    TEMPLATE_INVALID_VARIABLE_NAME: {
      number: 900,
      message:
        "Variable names can only include ascii letters and numbers, and start with a letter, but got %variable%"
    },
    TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG: {
      number: 901,
      message:
        "Template values can't include variable tags, but %variable%'s value includes one"
    },
    TEMPLATE_VARIABLE_TAG_MISSING: {
      number: 902,
      message: "Variable %variable%'s tag not present in the template"
    }
  }
};
