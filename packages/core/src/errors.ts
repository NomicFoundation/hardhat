import { ERRORS, ErrorDescriptor, getErrorCode } from "./errors-list";

/**
 * All exceptions intentionally thrown with Ignition-core
 * extend this class.
 *
 * @alpha
 */
export class IgnitionError extends Error {
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
 * @beta
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
