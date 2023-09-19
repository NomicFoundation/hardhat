export const ERROR_PREFIX = "IGN";

export interface ErrorDescriptor {
  number: number;
  // Message can use templates. See applyErrorMessageTemplate
  message: string;
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
  GENERAL: {
    min: 1,
    max: 99,
    title: "General errors",
  },
  INTERNAL: {
    min: 100,
    max: 199,
    title: "Internal Ignition errors",
  },
  MODULE: {
    min: 200,
    max: 299,
    title: "Module related errors",
  },
  SERIALIZATION: {
    min: 300,
    max: 399,
    title: "Serialization errors",
  },
  EXECUTION: {
    min: 400,
    max: 499,
    title: "Execution errors",
  },
  RECONCILIATION: {
    min: 500,
    max: 599,
    title: "Reconciliation errors",
  },
  WIPE: {
    min: 600,
    max: 699,
    title: "Wipe errors",
  },
};

export const ERRORS = {
  GENERAL: {
    ASSERTION_ERROR: {
      number: 1,
      message: "Internal Ignition invariant was violated: %description%",
    },
  },
  INTERNAL: {
    TEMPLATE_INVALID_VARIABLE_NAME: {
      number: 100,
      message:
        "Variable names can only include ascii letters and numbers, and start with a letter, but got %variable%",
    },
    TEMPLATE_VARIABLE_NOT_FOUND: {
      number: 101,
      message: "Variable %variable%'s tag not present in the template",
    },
    TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG: {
      number: 102,
      message:
        "Template values can't include variable tags, but %variable%'s value includes one",
    },
  },
  MODULE: {
    INVALID_MODULE_ID: {
      number: 200,
      message: "Module id must be a string",
    },
    INVALID_MODULE_ID_CHARACTERS: {
      number: 201,
      message:
        'The moduleId "%moduleId%" contains banned characters, ids can only contain alphanumerics or underscores',
    },
    INVALID_MODULE_DEFINITION_FUNCTION: {
      number: 202,
      message: "Module definition function must be a function",
    },
    ASYNC_MODULE_DEFINITION_FUNCTION: {
      number: 203,
      message:
        "The callback passed to 'buildModule' for %moduleDefinitionId% returns a Promise; async callbacks are not allowed in 'buildModule'.",
    },
  },
  SERIALIZATION: {
    INVALID_FUTURE_ID: {
      number: 300,
      message: "Unable to lookup future during deserialization: %futureId%",
    },
    INVALID_FUTURE_TYPE: {
      number: 301,
      message: "Invalid FutureType %type% as serialized argument",
    },
    LOOKAHEAD_NOT_FOUND: {
      number: 302,
      message: "Lookahead value %key% missing",
    },
  },
  EXECUTION: {
    FUTURE_NOT_FOUND: {
      number: 400,
      message: "Could not locate future id from batching",
    },
    DROPPED_TRANSACTION: {
      number: 401,
      message:
        "Error while executing %futureId%: all the transactions of its network interaction %networkInteractionId% were dropped. Please try rerunning Ignition.",
    },
    INVALID_JSON_RPC_RESPONSE: {
      number: 402,
      message: "Invalid JSON-RPC response for %method%: %response%",
    },
    WAITING_FOR_CONFIRMATIONS: {
      number: 403,
      message:
        "You have sent transactions from %sender%. Please wait until they get %requiredConfirmations% confirmations before running Ignition again.",
    },
    WAITING_FOR_NONCE: {
      number: 404,
      message:
        "You have sent transactions from %sender% with nonce %nonce%. Please wait until they get %requiredConfirmations% confirmations before running Ignition again.",
    },
    INVALID_NONCE: {
      number: 405,
      message:
        "The next nonce for %sender% should be %expectedNonce%, but is %pendingCount%. Please make sure not to send transactions from %sender% while running this deployment and try again.",
    },
  },
  RECONCILIATION: {
    INVALID_EXECUTION_STATUS: {
      number: 500,
      message: "Unsupported execution status: %status%",
    },
  },
  WIPE: {
    UNINITIALIZED_DEPLOYMENT: {
      number: 600,
      message:
        "Cannot wipe %futureId% as the deployment hasn't been intialialized yet",
    },
    NO_STATE_FOR_FUTURE: {
      number: 601,
      message: "Cannot wipe %futureId% as no state recorded against it",
    },
    DEPENDENT_FUTURES: {
      number: 602,
      message: `Cannot wipe %futureId% as there are dependent futures that have already started: %dependents%`,
    },
  },
};

/**
 * Setting the type of ERRORS to a map let us access undefined ones. Letting it
 * be a literal doesn't enforce that its values are of type ErrorDescriptor.
 *
 * We let it be a literal, and use this variable to enforce the types
 */
const _PHONY_VARIABLE_TO_FORCE_ERRORS_TO_BE_OF_TYPE_ERROR_DESCRIPTOR: {
  [category: string]: {
    [name: string]: ErrorDescriptor;
  };
} = ERRORS;
