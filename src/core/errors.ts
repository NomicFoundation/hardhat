import util from "util";
import assert from "assert";

const ERROR_PREFIX = "BDLR";

export class BuidlerError extends Error {
  public readonly number: number;
  public readonly parent?: Error;

  constructor(
    errorDescription?: any,
    parentError?: any,
    ...messageArguments: any[]
  ) {
    if (errorDescription === undefined || errorDescription instanceof Error) {
      parentError = errorDescription;
      errorDescription = ERRORS.BUIDLER_INTERNAL_ERROR;
    }

    const hasParentError = parentError instanceof Error;

    if (parentError !== undefined && !hasParentError) {
      messageArguments.unshift(parentError);
    }

    const paddedNumber = errorDescription.number.toString().padStart(4, "0");
    const prefix = ERROR_PREFIX + paddedNumber + ": ";

    const formattedMessage = util.format(
      errorDescription.message,
      ...messageArguments
    );

    super(prefix + formattedMessage);
    this.number = errorDescription.number;

    if (hasParentError) {
      this.parent = parentError;
    }
  }
}

interface KnownErrors {
  [name: string]: { number: number; message: string };
}

export const ERRORS: KnownErrors = {
  BUIDLER_INTERNAL_ERROR: {
    number: 1,
    message: "An error occurred while creating this error, please report it."
  },
  BUIDLER_NOT_INSIDE_PROJECT: {
    number: 2,
    message: "You are not inside a buidler project."
  },
  NETWORK_CONFIG_NOT_FOUND: {
    number: 3,
    message: 'Network "%s" not defined'
  },
  NETWORK_HAS_NO_HOST: {
    number: 4,
    message: 'Network "%s" has no host defined.'
  },
  NETWORK_AUTO_NO_SYNC: {
    number: 5,
    message:
      'Network "auto" does not support sync requests. Consider using pweb3 instead.'
  },
  ENV_VARIABLE_ARG_INVALID_VALUE: {
    number: 6,
    message: "Invalid environment variable %s's value: %s"
  },
  PWEB3_NOT_SUPPORTED: {
    number: 7,
    message: "%s is not supported."
  },
  PWEB3_NO_SYNC: {
    number: 8,
    message:
      "You tried to access %s, but pweb3 doesn't support synchronous requests."
  },
  ARG_TYPE_INVALID_VALUE: {
    number: 9,
    message: 'Invalid value "%s" for argument "%s" of type %s'
  },
  TASKS_DEFINITION_PARAM_AFTER_VARIADIC: {
    number: 10,
    message:
      'Could not set positional param "%s" for task "%s" because there is already a variadic positional param and it has to be the last positional one.'
  },
  TASKS_DEFINITION_PARAM_ALREADY_DEFINED: {
    number: 11,
    message:
      'Could not set param "%s" for task "%s" because its name is already used.'
  },
  TASKS_DEFINITION_PARAM_CLASHES_WITH_GLOBAL: {
    number: 12,
    message:
      'Could not set param "%s" for task "%s" because its name is used as a global param.'
  },
  TASKS_DEFINITION_MANDATORY_PARAM_AFTER_OPTIONAL: {
    number: 13,
    message:
      'Could not set param "%s" for task "%s" because it is mandatory and it was added after an optional positional param.'
  },
  TASKS_DEFINITION_OVERLOAD_NO_PARAMS: {
    number: 14,
    message:
      'Redefinition of task "%s" failed. You can\'t change param definitions in an overloaded task.'
  },
  TASKS_DEFINITION_NO_ACTION: {
    number: 15,
    message: 'No action set for task "%s".'
  },
  TRUFFLE_ARTIFACT_NOT_FOUND: {
    number: 16,
    message:
      'Artifacts for contract "%s" not found. You may have misspelled its name, or forgot to compile.'
  },
  TRUFFLE_CONTRACT_NOT_LINKED: {
    number: 17,
    message: 'Contract "%s" has to be linked before deployment.'
  },
  TRUFFLE_LIBRARY_NOT_DEPLOYED: {
    number: 18,
    message:
      'Cannot link contract "%s" with library "%s" because it has not been deployed.'
  },
  RESOLVER_FILE_NOT_FOUND: {
    number: 19,
    message: 'File "%s" doesn\'t exist.'
  },
  RESOLVER_FILE_OUTSIDE_PROJECT: {
    number: 20,
    message: 'File "%s" is outside the project.'
  },
  RESOLVER_LIBRARY_FILE_NOT_LOCAL: {
    number: 21,
    message: 'File "%s" belongs to a library but was treated as a local one.'
  },
  RESOLVER_LIBRARY_NOT_INSTALLED: {
    number: 22,
    message: 'Library "%s" is not installed.'
  },
  RESOLVER_LIBRARY_FILE_NOT_FOUND: {
    number: 23,
    message: 'File "%s" doesn\'t exist.'
  },
  RESOLVER_ILLEGAL_IMPORT: {
    number: 24,
    message: 'Illegal import "%s" from "%s".'
  },
  COMPILER_INVALID_VERSION: {
    number: 25,
    message: 'Solidity version "%s" is invalid or hasn\'t been released yet.'
  },
  COMPILER_DOWNLOAD_FAILED: {
    number: 26,
    message:
      'Couldn\'t download compiler version "%s". Please check your connection or use local version "%s"'
  },
  COMPILER_VERSION_LIST_DOWNLOAD_FAILED: {
    number: 27,
    message:
      'Couldn\'t download compiler versions list. Please check your connection or use local version "%s"'
  },
  COMPILER_INVALID_DOWNLOAD: {
    number: 28,
    message:
      'Couldn\'t download compiler version "%s". Downloaded version\'s checksum doesn\'t much the expected one. Please check your connection or use local version "%s"'
  },
  ARGUMENT_PARSER_UNRECOGNIZED_TASK: {
    number: 29,
    message: 'Unrecognized task "%s".'
  },
  ARGUMENT_PARSER_UNRECOGNIZED_COMMAND_LINE_ARG: {
    number: 30,
    message:
      'Unrecognised command line argument "%s". Note that task arguments must come after the task name.'
  },
  ARGUMENT_PARSER_UNRECOGNIZED_PARAM_NAME: {
    number: 31,
    message: 'Unrecognized param "%s".'
  },
  ARGUMENT_PARSER_MISSING_TASK_ARGUMENT: {
    number: 32,
    message: 'Missing task argument "%s".'
  },
  ARGUMENT_PARSER_MISSING_BUIDLER_ARGUMENT: {
    number: 33,
    message: 'Missing buidler argument "%s".'
  },
  ARGUMENT_PARSER_MISSING_POSITIONAL_ARG: {
    number: 34,
    message: 'Missing positional argument "%s"'
  },
  ARGUMENT_PARSER_UNRECOGNIZED_POSITIONAL_ARG: {
    number: 35,
    message: 'Unrecognized positional argument "%s"'
  },
  ARGUMENT_PARSER_REPEATED_PARAM: {
    number: 36,
    message: 'Repeated parameter "%s".'
  },
  HELP_PRINTER_UNRECOGNIZED_TASK: {
    number: 37,
    message: 'Unrecognized task "%s".'
  },
  INTERACTIVE_DEPLOYER_INVALID_FROM: {
    number: 38,
    message: "Invalid deployer address: %s"
  },
  INTERACTIVE_DEPLOYER_FROM_NOT_MANAGED: {
    number: 39,
    message:
      "Deployer account is not currently managed by the node you are connected to."
  },
  TASK_COMPILE_FAILURE: {
    number: 40,
    message: "Compilation failed"
  },
  TASK_DEPLOY_NON_INTERACTIVE: {
    number: 41,
    message: 'Task "deploy" can\'t be run from a script.'
  },
  TASK_RUN_FILE_NOT_FOUND: {
    number: 42,
    message: 'Script "%s" doesn\'t exist.'
  },
  TASK_RUN_SCRIPT_ERROR: {
    number: 43,
    message: 'Error running script "%s": %s'
  },
  TASK_FLATTEN_CYCLE: {
    number: 44,
    message: "buidler flatten doesn't support cyclic dependencies."
  }
};

function areNumbersRepeated(errors: KnownErrors) {
  const numbers = Object.values(errors).map(d => d.number);
  return numbers.length !== new Set(numbers).size;
}

assert(!areNumbersRepeated(ERRORS));
