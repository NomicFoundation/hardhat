import { BuidlerError, ERRORS } from "../errors";

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
      ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
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
        ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
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
        ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
        strValue,
        argName,
        "float"
      );
    }

    return Number(strValue);
  }
};

export let inputFile: ArgumentType<string> = {
  name: "inputFile",
  parse(argName: string, strValue: string): string {
    try {
      const fs = require("fs");
      const fsExtra = require("fs-extra");
      fs.accessSync(strValue, fsExtra.constants.R_OK);
      const stats = fs.lstatSync(strValue);

      if (stats.isDirectory()) {
        // This is caught and encapsulated in a buidler error.
        // tslint:disable-next-line only-buidler-error
        throw new Error(strValue + " is a directory, not a file");
      }
    } catch (error) {
      throw new BuidlerError(
        ERRORS.ARGUMENTS.INVALID_INPUT_FILE,
        error,
        argName,
        strValue
      );
    }

    return strValue;
  }
};
