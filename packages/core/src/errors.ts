import { ERRORS, ErrorDescriptor, getErrorCode } from "./errors-list";

/**
 * Base error class extended by all custom errors.
 * Placeholder to allow us to customize error output formatting in the future.
 *
 * @alpha
 */
export class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * All exceptions intentionally thrown with Ignition-core
 * extend this class.
 *
 * @alpha
 */
export class IgnitionError extends CustomError {
  constructor(
    errorDescriptor: ErrorDescriptor,
    messageArguments: Record<string, string | number> = {}
  ) {
    const prefix = `${getErrorCode(errorDescriptor)}: `;
    const formattedMessage = applyErrorMessageTemplate(
      errorDescriptor.message,
      messageArguments
    );

    super(prefix + formattedMessage);

    this.name = this.constructor.name;
  }
}

/**
 * This class is used to throw errors from Ignition plugins made by third parties.
 *
 * @alpha
 */
export class IgnitionPluginError extends CustomError {
  public static isIgnitionPluginError(
    error: any
  ): error is IgnitionPluginError {
    return (
      typeof error === "object" &&
      error !== null &&
      (error as IgnitionPluginError)._isIgnitionPluginError === true
    );
  }

  private readonly _isIgnitionPluginError = true;

  public readonly pluginName: string;

  constructor(pluginName: string, message: string) {
    super(message);
    this.pluginName = pluginName;

    // This is required to allow calls to `resetStackFrom`,
    // otherwise the function is not available on the
    // error instance
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * This class is used to throw errors from *core* Ignition plugins.
 * If you are developing a third-party plugin, use IgnitionPluginError instead.
 *
 * @alpha
 */
export class NomicIgnitionPluginError extends IgnitionPluginError {
  public static isNomicIgnitionPluginError(
    error: any
  ): error is NomicIgnitionPluginError {
    return (
      typeof error === "object" &&
      error !== null &&
      (error as NomicIgnitionPluginError)._isNomicIgnitionPluginError === true
    );
  }

  private readonly _isNomicIgnitionPluginError = true;

  constructor(pluginName: string, message: string) {
    super(pluginName, message);
    Object.setPrototypeOf(this, NomicIgnitionPluginError.prototype);
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
 * @param template - The template string.
 * @param values - A map of variable names to their values.
 *
 * @alpha
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
        throw new IgnitionError(
          ERRORS.INTERNAL.TEMPLATE_INVALID_VARIABLE_NAME,
          {
            variable: variableName,
          }
        );
      }

      const variableTag = `%${variableName}%`;

      if (!template.includes(variableTag)) {
        throw new IgnitionError(ERRORS.INTERNAL.TEMPLATE_VARIABLE_NOT_FOUND, {
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
      throw new IgnitionError(
        ERRORS.INTERNAL.TEMPLATE_VALUE_CONTAINS_VARIABLE_TAG,
        { variable: variableName }
      );
    }

    template = template.split(variableTag).join(value);
  }

  return template;
}
