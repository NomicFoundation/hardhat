import { CustomError } from "@nomicfoundation/hardhat-utils/error";

import { ERRORS, ErrorDescriptor } from "./descriptors.js";

export type ErrorMessageTemplateValue =
  | string
  | number
  | boolean
  | bigint
  | undefined
  | null
  | { toString(): string };

export type MessagetTemplateArguments<MessageTemplateT extends string> =
  MessageTemplateT extends `${string}{${infer Tag}}${infer Rest}`
    ? {
        [K in
          | Tag
          | keyof MessagetTemplateArguments<Rest>]: ErrorMessageTemplateValue;
      }
    : {};

export type HardhatErrorConstructorArguments<
  ErrorDescriptorT extends ErrorDescriptor,
> = keyof MessagetTemplateArguments<
  ErrorDescriptorT["messageTemplate"]
> extends never
  ? [ErrorDescriptorT, Error?]
  : [
      ErrorDescriptorT,
      MessagetTemplateArguments<ErrorDescriptorT["messageTemplate"]>,
      Error?,
    ];

export const ERROR_PREFIX = "HHE";

const IS_HARDHAT_ERROR_PROPERTY_NAME = "_isHardhatError";

export class HardhatError<
  ErrorDescriptorT extends ErrorDescriptor,
> extends CustomError {
  public static readonly ERRORS = ERRORS;

  readonly #descriptor: ErrorDescriptorT;

  readonly #arguments: MessagetTemplateArguments<
    ErrorDescriptorT["messageTemplate"]
  >;

  constructor(
    ...[
      errorDescriptor,
      messageArgumentsOrParentError,
      parentError,
    ]: HardhatErrorConstructorArguments<ErrorDescriptorT>
  ) {
    const prefix = `${getErrorCode(errorDescriptor)}: `;

    const formattedMessage =
      messageArgumentsOrParentError === undefined ||
      messageArgumentsOrParentError instanceof Error
        ? errorDescriptor.messageTemplate
        : applyErrorMessageTemplate(
            errorDescriptor.messageTemplate,
            messageArgumentsOrParentError,
          );

    super(
      prefix + formattedMessage,
      parentError instanceof Error
        ? parentError
        : messageArgumentsOrParentError instanceof Error
          ? messageArgumentsOrParentError
          : undefined,
    );

    this.#descriptor = errorDescriptor;

    if (
      messageArgumentsOrParentError === undefined ||
      messageArgumentsOrParentError instanceof Error
    ) {
      this.#arguments = {} as MessagetTemplateArguments<
        ErrorDescriptorT["messageTemplate"]
      >;
    } else {
      this.#arguments = messageArgumentsOrParentError;
    }

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

  public static isHardhatError(
    other: unknown,
  ): other is HardhatError<ErrorDescriptor>;
  public static isHardhatError<ErrorDescriptorT extends ErrorDescriptor>(
    other: unknown,
    descriptor?: ErrorDescriptorT,
  ): other is HardhatError<ErrorDescriptorT>;
  public static isHardhatError(
    other: unknown,
    descriptor?: ErrorDescriptor,
  ): other is HardhatError<ErrorDescriptor> {
    if (typeof other !== "object" || other === null) {
      return false;
    }

    const isHardhatErrorProperty = Object.getOwnPropertyDescriptor(
      other,
      IS_HARDHAT_ERROR_PROPERTY_NAME,
    );

    return (
      isHardhatErrorProperty?.value === true &&
      // If an error descriptor is provided, check if its number matches the Hardhat error number
      (descriptor === undefined
        ? true
        : (other as HardhatError<ErrorDescriptor>).number === descriptor.number)
    );
  }

  public get number(): number {
    return this.#descriptor.number;
  }

  public get pluginId(): string | undefined {
    return this.#descriptor.pluginId;
  }

  public get descriptor(): ErrorDescriptor {
    return this.#descriptor;
  }

  public get messageArguments(): MessagetTemplateArguments<
    ErrorDescriptorT["messageTemplate"]
  > {
    return this.#arguments;
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
  values: Record<string, ErrorMessageTemplateValue>,
): string {
  return template.replaceAll(/{(.*?)}/g, (_match, variableName) => {
    const rawValue = values[variableName];

    if (rawValue === undefined) {
      return "undefined";
    }
    if (rawValue === null) {
      return "null";
    }

    return rawValue.toString();
  });
}
