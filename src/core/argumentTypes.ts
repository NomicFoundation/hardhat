import { BuidlerError, ERRORS } from "./errors";

export interface ArgumentType<T> {
  name: string;

  // This function must show if an invalid strValue is given
  parse(argName: string, strValue: string): T;
}

export const string: ArgumentType<string> = {
  name: "string",
  parse: (argName, strValue) => strValue
};

export const boolean: ArgumentType<boolean> = {
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
};

export const int: ArgumentType<number> = {
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
};

export const float: ArgumentType<number> = {
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
};
