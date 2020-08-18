import { getClosestCallerPackage } from "../util/caller-package";
import { replaceAll } from "../util/strings";

import { ErrorDescriptor, ERRORS, getErrorCode } from "./errors-list";

const inspect = Symbol.for("nodejs.util.inspect.custom");

class CustomError extends Error {
  constructor(message: string, public readonly parent?: Error) {
    // WARNING: Using super when extending a builtin class doesn't work well
    // with TS if you are compiling to a version of JavaScript that doesn't have
    // native classes. We don't do that in Buidler.
    //
    // For more info about this, take a look at: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    super(message);

    this.name = this.constructor.name;

    // We do this to avoid including the constructor in the stack trace
    if ((Error as any).captureStackTrace !== undefined) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  public [inspect]() {
    let str = this.stack;
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

export class BuidlerError extends CustomError {
  public static isBuidlerError(other: any): other is BuidlerError {
    return (
      other !== undefined && other !== null && other._isBuidlerError === true
    );
  }

  public readonly errorDescriptor: ErrorDescriptor;
  public readonly number: number;

  private readonly _isBuidlerError: boolean;

  constructor(
    errorDescriptor: ErrorDescriptor,
    messageArguments: { [p: string]: any } = {},
    parentError?: Error
  ) {
    const prefix = `${getErrorCode(errorDescriptor)}: `;

    const formattedMessage = applyErrorMessageTemplate(
      errorDescriptor.message,
      messageArguments
    );

    super(prefix + formattedMessage, parentError);

    this.errorDescriptor = errorDescriptor;
    this.number = errorDescriptor.number;

    this._isBuidlerError = true;
    Object.setPrototypeOf(this, BuidlerError.prototype);
  }
}

/**
 * This class is used to throw errors from buidler plugins made by third parties.
 */
export class BuidlerPluginError extends CustomError {
  public static isBuidlerPluginError(other: any): other is BuidlerPluginError {
    return (
      other !== undefined &&
      other !== null &&
      other._isBuidlerPluginError === true
    );
  }

  public readonly pluginName: string;

  private readonly _isBuidlerPluginError: boolean;

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
      super(messageOrParent, parent);
      this.pluginName = pluginNameOrMessage;
    } else {
      super(pluginNameOrMessage, messageOrParent);
      this.pluginName = getClosestCallerPackage()!;
    }

    this._isBuidlerPluginError = true;
    Object.setPrototypeOf(this, BuidlerPluginError.prototype);
  }
}

export class NomicLabsBuidlerPluginError extends BuidlerPluginError {
  public static isNomicLabsBuidlerPluginError(
    other: any
  ): other is NomicLabsBuidlerPluginError {
    return (
      other !== undefined &&
      other !== null &&
      other._isNomicLabsBuidlerPluginError === true
    );
  }

  private readonly _isNomicLabsBuidlerPluginError: boolean;

  /**
   * This class is used to throw errors from *core* buidler plugins. If you are
   * developing a third-party plugin, use BuidlerPluginError instead.
   */
  public constructor(
    pluginName: string,
    message: string,
    parent?: Error,
    public shouldBeReported = false
  ) {
    super(pluginName, message, parent);

    this._isNomicLabsBuidlerPluginError = true;
    Object.setPrototypeOf(this, NomicLabsBuidlerPluginError.prototype);
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
          variable: variableName,
        });
      }

      const variableTag = `%${variableName}%`;

      if (!template.includes(variableTag)) {
        throw new BuidlerError(ERRORS.INTERNAL.TEMPLATE_VARIABLE_TAG_MISSING, {
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
      throw new BuidlerError(
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG,
        { variable: variableName }
      );
    }

    template = replaceAll(template, variableTag, value);
  }

  return template;
}
