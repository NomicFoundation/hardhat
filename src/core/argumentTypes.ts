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
    if (strValue.toLowerCase() === "true") {
      return true;
    }
    if (strValue.toLowerCase() === "false") {
      return false;
    }

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
    const decimalPattern = /^\d+(?:[eE]\d+)?$/;
    const hexPattern = /^0[xX][\dABCDEabcde]+$/;

    if (!strValue.match(decimalPattern) && !strValue.match(hexPattern)) {
      throw new BuidlerError(
        ERRORS.ARG_TYPE_INVALID_VALUE,
        strValue,
        argName,
        "int"
      );
    }

    return Number(strValue);
  }
};

export const float: ArgumentType<number> = {
  name: "float",
  parse: (argName, strValue) => {
    const decimalPattern = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]\d+)?$/;
    const hexPattern = /^0[xX][\dABCDEabcde]+$/;

    if (!strValue.match(decimalPattern) && !strValue.match(hexPattern)) {
      throw new BuidlerError(
        ERRORS.ARG_TYPE_INVALID_VALUE,
        strValue,
        argName,
        "float"
      );
    }

    return Number(strValue);
  }
};
