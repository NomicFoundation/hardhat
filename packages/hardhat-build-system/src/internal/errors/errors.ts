import { replaceAll } from "../utils/string";
import { ErrorDescriptor, ERRORS, getErrorCode } from "./errors-list";

const inspect = Symbol.for("nodejs.util.inspect.custom");

export class CustomError extends Error {
  private _stack: string;

  constructor(
    message: string,
    public readonly parent?: Error,
  ) {
    // WARNING: Using super when extending a builtin class doesn't work well
    // with TS if you are compiling to a version of JavaScript that doesn't have
    // native classes. We don't do that in Hardhat.
    //
    // For more info about this, take a look at: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    super(message);

    this.name = this.constructor.name;

    // We do this to avoid including the constructor in the stack trace
    if ((Error as any).captureStackTrace !== undefined) {
      (Error as any).captureStackTrace(this, this.constructor);
    }

    this._stack = this.stack ?? "";

    Object.defineProperty(this, "stack", {
      get: () => this[inspect](),
    });
  }

  public [inspect](): string {
    let str = this._stack;
    if (this.parent !== undefined) {
      const parentAsAny = this.parent as any;
      const causeString =
        parentAsAny[inspect]?.() ??
        parentAsAny.inspect?.() ??
        parentAsAny.stack ??
        parentAsAny.toString();
      const nestedCauseStr = causeString
        .split("\n")
        .map((line: string) => `    ${line}`)
        .join("\n")
        .trim();
      str += `

    Caused by: ${nestedCauseStr}`;
    }
    return str;
  }
}

export class HardhatError extends CustomError {
  public static isHardhatError(other: any): other is HardhatError {
    return (
      other !== undefined &&
      other !== null &&
      (other as HardhatError)._isHardhatError === true
    );
  }

  public static isHardhatErrorType(
    other: any,
    descriptor: ErrorDescriptor,
  ): other is HardhatError {
    return (
      HardhatError.isHardhatError(other) &&
      other.errorDescriptor.number === descriptor.number
    );
  }

  public readonly errorDescriptor: ErrorDescriptor;
  public readonly number: number;
  public readonly messageArguments: Record<string, any>;

  private readonly _isHardhatError: boolean;

  constructor(
    errorDescriptor: ErrorDescriptor,
    messageArguments: Record<string, string | number> = {},
    parentError?: Error,
  ) {
    const prefix = `${getErrorCode(errorDescriptor)}: `;

    const formattedMessage = applyErrorMessageTemplate(
      errorDescriptor.message,
      messageArguments,
    );

    super(prefix + formattedMessage, parentError);

    this.errorDescriptor = errorDescriptor;
    this.number = errorDescriptor.number;
    this.messageArguments = messageArguments;

    this._isHardhatError = true;
    Object.setPrototypeOf(this, HardhatError.prototype);
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
  values: { [templateVar: string]: any },
): string {
  return _applyErrorMessageTemplate(template, values, false);
}

function _applyErrorMessageTemplate(
  template: string,
  values: { [templateVar: string]: any },
  isRecursiveCall: boolean,
): string {
  if (!isRecursiveCall) {
    for (const variableName of Object.keys(values)) {
      if (variableName.match(/^[a-zA-Z][a-zA-Z0-9]*$/) === null) {
        throw new HardhatError(ERRORS.INTERNAL.TEMPLATE_INVALID_VARIABLE_NAME, {
          variable: variableName,
        });
      }

      const variableTag = `%${variableName}%`;

      if (!template.includes(variableTag)) {
        throw new HardhatError(ERRORS.INTERNAL.TEMPLATE_VARIABLE_TAG_MISSING, {
          variable: variableName,
        });
      }
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
      throw new HardhatError(
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG,
        { variable: variableName },
      );
    }

    template = replaceAll(template, variableTag, value);
  }

  return template;
}

export function assertHardhatInvariant(
  invariant: boolean,
  message: string,
): asserts invariant {
  if (!invariant) {
    throw new HardhatError(ERRORS.GENERAL.ASSERTION_ERROR, { message });
  }
}
