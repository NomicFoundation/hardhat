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
    title: "Internal errors",
  },
};

export const ERRORS = {
  GENERAL: {
    TEST: {
      number: 1,
      message: "Test error",
    },
  },
  INTERNAL: {
    TEMPLATE_INVALID_VARIABLE_NAME: {
      number: 100,
      message: "Invalid variable name: %variable%",
    },
    TEMPLATE_VARIABLE_NOT_FOUND: {
      number: 101,
      message: "Variable not found: %variable%",
    },
    TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG: {
      number: 102,
      message: "Value contains variable tag: %variable%",
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
