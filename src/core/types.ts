import { BuidlerError, ERRORS } from "./errors";

/**
 * This is a dictionary of type names to functions that receive the param name
 * and the raw string value. They validate the value, throwing if invalid, and
 * convert the right type.
 */
export default {
  string: {
    name: "string",
    parse: (argName, strValue) => strValue
  },
  boolean: {
    name: "boolean",
    parse: (argName, strValue) => {
      if (strValue.toLowerCase() === "true") return true;
      if (strValue.toLowerCase() === "false") return false;

      throw new BuidlerError(
        ERRORS.ARG_TYPE_INVALID_VALUE,
        strValue,
        argName,
        "boolean"
      );
    }
  },
  int: {
    name: "int",
    parse: (argName, strValue) => {
      const n = Number(strValue);

      if (isNaN(n) || !Number.isInteger(n)) {
        throw new BuidlerError(
          ERRORS.ARG_TYPE_INVALID_VALUE,
          strValue,
          argName,
          "integer"
        );
      }

      return n;
    }
  },
  float: {
    name: "float",
    parse: (argName, strValue) => {
      const n = Number(strValue);

      if (isNaN(n)) {
        throw new BuidlerError(
          ERRORS.ARG_TYPE_INVALID_VALUE,
          strValue,
          argName,
          "float"
        );
      }

      return n;
    }
  }
};
