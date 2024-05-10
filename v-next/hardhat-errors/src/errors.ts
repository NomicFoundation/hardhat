import { CustomError } from "@nomicfoundation/hardhat-utils/error";
import { ERRORS, ErrorDescriptor } from "./descriptors.js";

export const ERROR_PREFIX = "HHE";

const IS_HARDHAT_ERROR_PROPERTY_NAME = "_isHardhatError";

export type ErrorMessageTemplateValue =
  | string
  | number
  | boolean
  | bigint
  | undefined
  | null
  | { toString(): string };

export type ErrorMessageTemplateArguments = Record<
  string,
  ErrorMessageTemplateValue
>;

export class HardhatError extends CustomError {
  public static readonly ERRORS = ERRORS;

  readonly #descriptor: ErrorDescriptor;

  constructor(
    errorDescriptor: ErrorDescriptor,
    messageArguments: ErrorMessageTemplateArguments = {},
    parentError?: Error,
  ) {
    const prefix = `${getErrorCode(errorDescriptor)}: `;

    const formattedMessage = applyErrorMessageTemplate(
      errorDescriptor.messageTemplate,
      messageArguments,
    );

    super(prefix + formattedMessage, parentError);

    this.#descriptor = errorDescriptor;

    // As this package is going to be used from most of our packages, there's a
    // change of users having multiple versions of it. If that happens, they may
    // have multiple `HardhatError` classes, so we can't reliably use
    // `instanceof` to check if an error is a `HardhatError`. We define a
    // pseudo-private field to use it for it. While this is not bulletproof, it
    // should be enough for our case, as we won't be changing this class often.
    Object.defineProperty(this, IS_HARDHAT_ERROR_PROPERTY_NAME, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: true,
    });
  }

  public static isHardhatError(other: unknown): other is HardhatError {
    if (typeof other !== "object" || other === null) {
      return false;
    }

    const isHardhatErrorProperty = Object.getOwnPropertyDescriptor(
      other,
      IS_HARDHAT_ERROR_PROPERTY_NAME,
    );

    return isHardhatErrorProperty?.value === true;
  }

  public get number(): number {
    return this.#descriptor.number;
  }
}

/**
 * Asserts an internal invariant.
 *
 * @param invariant The condition to check.
 * @param message A message to show if the condition is false.
 */
export function assertHardhatInvariant(
  invariant: boolean,
  message: string,
): asserts invariant {
  if (!invariant) {
    throw new HardhatError(ERRORS.INTERNAL.ASSERTION_ERROR, { message });
  }
}

function getErrorCode(errorDescriptor: ErrorDescriptor): string {
  return `${ERROR_PREFIX}${errorDescriptor.number}`;
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
  values: ErrorMessageTemplateArguments,
): string {
  return _applyErrorMessageTemplate(template, values, false);
}

function _applyErrorMessageTemplate(
  template: string,
  values: ErrorMessageTemplateArguments,
  isRecursiveCall: boolean,
): string {
  if (!isRecursiveCall) {
    for (const variableName of Object.keys(values)) {
      assertHardhatInvariant(
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(variableName),
        `Trying to apply error template but variable "${variableName}" is invalid. Variable names can only include ascii letters and numbers, and start with a letter.`,
      );

      const variableTag = `%${variableName}%`;

      assertHardhatInvariant(
        template.includes(variableTag),
        `Trying to apply error template but variable "${variableName}" is not present in the template.`,
      );
    }
  }

  if (template.includes("%%")) {
    return template
      .split("%%")
      .map((part) => _applyErrorMessageTemplate(part, values, true))
      .join("%");
  }

  for (const variableName of Object.keys(values)) {
    let value: string;

    const rawValue = values[variableName];

    if (rawValue === undefined) {
      value = "undefined";
    } else if (rawValue === null) {
      value = "null";
    } else {
      value = rawValue.toString();
    }

    const variableTag = `%${variableName}%`;

    assertHardhatInvariant(
      !/%([a-zA-Z][a-zA-Z0-9]*)?%/.test(value),
      `Trying to apply an error template but variable "${variableName}" has a value that contains a variable tag.`,
    );

    template = template.replaceAll(variableTag, value);
  }

  return template;
}
