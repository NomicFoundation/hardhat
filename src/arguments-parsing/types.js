/**
 * This is a dictionary of type names to functions that receive the param name
 * and the raw string value. They validate the value, throwing if invalid, and
 * convert the right type.
 */

module.exports = {
  string: {
    name: "string",
    parse: (argName, strValue) => strValue
  },
  boolean: {
    name: "boolean",
    parse: (argName, strValue) => {
      if (strValue.toLowerCase() === "true") return true;
      if (strValue.toLowerCase() === "false") return false;
      throw new Error(
        `Unrecognized boolean value "${strValue}" of param ${argName}`
      );
    }
  },
  int: {
    name: "int",
    parse: (argName, strValue) => {
      const parsed = parseInt(strValue, 10);
      if (isNaN(parsed))
        throw new Error(
          `Unrecognized integer value "${strValue}" of param ${argName}`
        );

      return parsed;
    }
  },
  float: {
    name: "float",
    parse: (argName, strValue) => {
      const parsed = parseFloat(strValue);
      if (isNaN(parsed))
        throw new Error(
          `Unrecognized float value "${strValue}" of param ${argName}`
        );

      return parsed;
    }
  }
};
