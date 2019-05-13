import util from "util";

import { getClosestCallerPackage } from "../util/caller-package";

const ERROR_PREFIX = "BDLR";

export interface ErrorDescription {
  number: number;
  message: string;
}

export function isBuidlerError(error: any): error is BuidlerError {
  return error.isBuidlerError;
}

export function isBuidlerPluginError(error: any): error is BuidlerPluginError {
  return error.isBuidlerPluginError;
}

export class BuidlerError extends Error {
  public readonly number: number;
  public readonly parent?: Error;
  public readonly isBuidlerError: true;

  constructor(
    errorDescription: ErrorDescription,
    parentError: Error,
    ...messageArguments: any[]
  );
  constructor(errorDescription: ErrorDescription, ...messageArguments: any[]);
  constructor(
    errorDescription: ErrorDescription,
    parentError?: Error,
    ...messageArguments: any[]
  ) {
    const hasParentError = parentError instanceof Error;

    if (parentError !== undefined && !hasParentError) {
      messageArguments.unshift(parentError);
    }

    const prefix = ERROR_PREFIX + errorDescription.number.toString() + ": ";

    const formattedMessage = util.format(
      errorDescription.message,
      ...messageArguments
    );

    super(prefix + formattedMessage);
    this.number = errorDescription.number;

    if (hasParentError) {
      this.parent = parentError;
    }

    this.isBuidlerError = true;
  }
}

/**
 * This class is used to throw errors from buidler plugins.
 * Resolves automatically the plugin's name from which it's being thrown.
 */
export class BuidlerPluginError extends Error {
  public readonly pluginName: string;
  public readonly isBuidlerPluginError: true;

  /**
   * Creates a BuidlerPluginError.
   * @param message an error message.
   * @param parent  an error.
   */
  public constructor(message: string, public readonly parent?: Error) {
    super(message);

    this.pluginName = getClosestCallerPackage()!;
    this.isBuidlerPluginError = true;
  }
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
export const ERROR_RANGES: {
  [category in keyof (typeof ERRORS)]: { min: number; max: number }
} = {
  GENERAL: { min: 0, max: 99 },
  NETWORK: { min: 100, max: 199 },
  TASK_DEFINITIONS: { min: 200, max: 299 },
  ARGUMENTS: { min: 300, max: 399 },
  RESOLVER: { min: 400, max: 499 },
  SOLC: { min: 500, max: 599 },
  BUILTIN_TASKS: { min: 600, max: 699 },
  ARTIFACTS: { min: 700, max: 799 },
  PLUGINS: { min: 800, max: 899 }
};

export const ERRORS = {
  GENERAL: {
    NOT_INSIDE_PROJECT: {
      number: 1,
      message: "You are not inside a buidler project."
    },
    INVALID_NODE_VERSION: {
      number: 2,
      message: "Buidler doesn't support your node version. It should be %s."
    },
    UNSUPPORTED_OPERATION: {
      number: 3,
      message: "%s is not supported in Buidler."
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
    }
  },
  NETWORK: {
    CONFIG_NOT_FOUND: {
      number: 100,
      message: 'Network "%s" not defined'
    },
    INVALID_GLOBAL_CHAIN_ID: {
      number: 101,
      message:
        "Buidler was set to use chain id %s, but connected to a chain with id %s."
    },
    INVALID_TX_CHAIN_ID: {
      number: 102,
      message:
        "Trying to send a tx with chain id %s, but Buidler is connected to a chain with id %s."
    },
    ETHSIGN_MISSING_DATA_PARAM: {
      number: 103,
      message: 'Missing "data" param when calling eth_sign.'
    },
    NOT_LOCAL_ACCOUNT: {
      number: 104,
      message:
        'Account "%s" is not managed by the current network access provider.'
    },
    MISSING_TX_PARAM_TO_SIGN_LOCALLY: {
      number: 105,
      message: 'Missing param "%s" from a tx being signed locally.'
    },
    NO_REMOTE_ACCOUNT_AVAILABLE: {
      number: 106,
      message:
        "No local account was set and there are accounts in the remote node."
    },
    INVALID_HD_PATH: {
      number: 107,
      message:
        'HD path "%s" is invalid. Read BIP32 to know about the valid forms.'
    }
  },
  TASK_DEFINITIONS: {
    PARAM_AFTER_VARIADIC: {
      number: 200,
      message:
        'Could not set positional param "%s" for task "%s" because there is already a variadic positional param and it has to be the last positional one.'
    },
    PARAM_ALREADY_DEFINED: {
      number: 201,
      message:
        'Could not set param "%s" for task "%s" because its name is already used.'
    },
    PARAM_CLASHES_WITH_BUIDLER_PARAM: {
      number: 202,
      message:
        'Could not set param "%s" for task "%s" because its name is used as a param for Buidler.'
    },
    MANDATORY_PARAM_AFTER_OPTIONAL: {
      number: 203,
      message:
        'Could not set param "%s" for task "%s" because it is mandatory and it was added after an optional positional param.'
    },
    OVERRIDE_NO_PARAMS: {
      number: 204,
      message:
        'Redefinition of task "%s" failed. You can\'t change param definitions in an overridden task.'
    },
    ACTION_NOT_SET: {
      number: 205,
      message: 'No action set for task "%s".'
    },
    RUNSUPER_NOT_AVAILABLE: {
      number: 206,
      message:
        'Tried to call runSupper from a non-overridden definition of task "%s"'
    },
    DEFAULT_VALUE_WRONG_TYPE: {
      number: 207,
      message:
        "Default value for param %s of task %s doesn't match the default one, try specifying it."
    },
    DEFAULT_IN_MANDATORY_PARAM: {
      number: 208,
      message: "Default value for param %s of task %s shouldn't be set."
    },
    INVALID_PARAM_NAME_CASING: {
      number: 209,
      message:
        "Invalid param name %s in task %s. Param names must be camelCase."
    }
  },
  ARGUMENTS: {
    INVALID_ENV_VAR_VALUE: {
      number: 300,
      message: "Invalid environment variable %s's value: %s"
    },
    INVALID_VALUE_FOR_TYPE: {
      number: 301,
      message: 'Invalid value "%s" for argument "%s" of type %s'
    },
    INVALID_INPUT_FILE: {
      number: 302,
      message:
        'Invalid argument "%s": File "%s" doesn\'t exist or is not a readable file.'
    },
    UNRECOGNIZED_TASK: {
      number: 303,
      message: 'Unrecognized task "%s".'
    },
    UNRECOGNIZED_COMMAND_LINE_ARG: {
      number: 304,
      message:
        'Unrecognised command line argument "%s". Note that task arguments must come after the task name.'
    },
    UNRECOGNIZED_PARAM_NAME: {
      number: 305,
      message: 'Unrecognized param "%s".'
    },
    MISSING_TASK_ARGUMENT: {
      number: 306,
      message: 'Missing task argument "%s".'
    },
    MISSING_POSITIONAL_ARG: {
      number: 307,
      message: 'Missing positional argument "%s"'
    },
    UNRECOGNIZED_POSITIONAL_ARG: {
      number: 308,
      message: 'Unrecognized positional argument "%s"'
    },
    REPEATED_PARAM: {
      number: 309,
      message: 'Repeated parameter "%s".'
    },
    PARAM_NAME_INVALID_CASING: {
      number: 310,
      message: 'Invalid param "%s". Command line params must be lowercase.'
    },
    INVALID_JSON_ARGUMENT: {
      number: 311,
      message: 'Error parsing JSON value for argument "%s": %s'
    }
  },
  RESOLVER: {
    FILE_NOT_FOUND: { number: 400, message: 'File "%s" doesn\'t exist.' },
    FILE_OUTSIDE_PROJECT: {
      number: 401,
      message: 'File "%s" is outside the project.'
    },
    LIBRARY_FILE_NOT_LOCAL: {
      number: 402,
      message: 'File "%s" belongs to a library but was treated as a local one.'
    },
    LIBRARY_NOT_INSTALLED: {
      number: 403,
      message: 'Library "%s" is not installed.'
    },
    LIBRARY_FILE_NOT_FOUND: {
      number: 404,
      message: 'File "%s" doesn\'t exist.'
    },
    ILLEGAL_IMPORT: {
      number: 405,
      message: 'Illegal import "%s" from "%s".'
    },
    FILE_OUTSIDE_LIB: {
      number: 406,
      message: 'File "%s" is outside its library.'
    },
    IMPORTED_FILE_NOT_FOUND: {
      number: 407,
      message: 'File "%s", imported from "%s", not found.'
    }
  },
  SOLC: {
    INVALID_VERSION: {
      number: 500,
      message: 'Solidity version "%s" is invalid or hasn\'t been released yet.'
    },
    DOWNLOAD_FAILED: {
      number: 501,
      message:
        'Couldn\'t download compiler version "%s". Please check your connection or use local version "%s"'
    },
    VERSION_LIST_DOWNLOAD_FAILED: {
      number: 502,
      message:
        'Couldn\'t download compiler versions list. Please check your connection or use local version "%s"'
    },
    INVALID_DOWNLOAD: {
      number: 503,
      message:
        'Couldn\'t download compiler version "%s". Checksum verification failed. Please check your connection or use local version "%s"'
    }
  },
  BUILTIN_TASKS: {
    COMPILE_FAILURE: {
      number: 600,
      message: "Compilation failed"
    },
    RUN_FILE_NOT_FOUND: {
      number: 601,
      message: 'Script "%s" doesn\'t exist.'
    },
    RUN_SCRIPT_ERROR: {
      number: 602,
      message: 'Error running script "%s": %s'
    },
    FLATTEN_CYCLE: {
      number: 603,
      message: "buidler flatten doesn't support cyclic dependencies."
    }
  },
  ARTIFACTS: {
    NOT_FOUND: {
      number: 700,
      message: 'Artifact for contract "%s" not found.'
    }
  },
  PLUGINS: {
    NOT_INSTALLED: {
      number: 800,
      message: "Plugin %s is not installed."
    },
    MISSING_DEPENDENCY: {
      number: 801,
      message:
        "Plugin %s requires %s to be installed.\n" +
        "Please run: npm install --save-dev %s@%s"
    },
    DEPENDENCY_VERSION_MISMATCH: {
      number: 802,
      message:
        "Plugin %s requires %s version %s but got %s.\n" +
        "If you haven't installed %s manually, please run: npm install --save-dev %s@%s\n" +
        "If you have installed %s yourself, please reinstall it with a valid version."
    },
    OLD_STYLE_IMPORT_DETECTED: {
      number: 803,
      message:
        "You are trying to load %s with a require or import statement.\n" +
        'Please replace it with a call to usePlugin("%s").'
    }
  }
};
