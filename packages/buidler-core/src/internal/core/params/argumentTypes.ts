import * as fs from "fs";
import fsExtra from "fs-extra";

import { BuidlerError } from "../errors";
import { ERRORS } from "../errors-list";

/**
 * Provides an interface for every valid task argument type.
 */
export interface ArgumentType<T> {
  /**
   * Type's name.
   */
  name: string;

  /**
   * Parses strValue. This function MUST throw BDLR301 if it
   * can parse the given value.
   *
   * @param argName argument's name.
   * @param strValue argument's value.
   *
   * @throws BDLR301 if an invalid value is given.
   * @returns the parsed value.
   */
  parse(argName: string, strValue: string): T;
}

/**
 * String type.
 *
 * Accepts any kind of string.
 */
export const string: ArgumentType<string> = {
  name: "string",
  parse: (argName, strValue) => strValue
};

/**
 * Boolean type.
 *
 * Accepts only 'true' or 'false' (case-insensitive).
 * @throws BDLR301
 */
export const boolean: ArgumentType<boolean> = {
  name: "boolean",
  parse: (argName, strValue) => {
    if (strValue.toLowerCase() === "true") {
      return true;
    }
    if (strValue.toLowerCase() === "false") {
      return false;
    }

    throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
      value: strValue,
      name: argName,
      type: "boolean"
    });
  }
};

/**
 * Int type.
 * Accepts either a decimal string integer or hexadecimal string integer.
 * @throws BDLR301
 */
export const int: ArgumentType<number> = {
  name: "int",
  parse: (argName, strValue) => {
    const decimalPattern = /^\d+(?:[eE]\d+)?$/;
    const hexPattern = /^0[xX][\dABCDEabcde]+$/;

    if (
      strValue.match(decimalPattern) === null &&
      strValue.match(hexPattern) === null
    ) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value: strValue,
        name: argName,
        type: "int"
      });
    }

    return Number(strValue);
  }
};

/**
 * Float type.
 * Accepts either a decimal string number or hexadecimal string number.
 * @throws BDLR301
 */
export const float: ArgumentType<number> = {
  name: "float",
  parse: (argName, strValue) => {
    const decimalPattern = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]\d+)?$/;
    const hexPattern = /^0[xX][\dABCDEabcde]+$/;

    if (
      strValue.match(decimalPattern) === null &&
      strValue.match(hexPattern) === null
    ) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value: strValue,
        name: argName,
        type: "float"
      });
    }

    return Number(strValue);
  }
};

/**
 * Input file type.
 * Accepts a path to a readable file..
 * @throws BDLR302
 */
export const inputFile: ArgumentType<string> = {
  name: "inputFile",
  parse(argName: string, strValue: string): string {
    try {
      fs.accessSync(strValue, fsExtra.constants.R_OK);
      const stats = fs.lstatSync(strValue);

      if (stats.isDirectory()) {
        // This is caught and encapsulated in a buidler error.
        // tslint:disable-next-line only-buidler-error
        throw new Error(`${strValue} is a directory, not a file`);
      }
    } catch (error) {
      throw new BuidlerError(
        ERRORS.ARGUMENTS.INVALID_INPUT_FILE,
        {
          name: argName,
          value: strValue
        },
        error
      );
    }

    return strValue;
  }
};

export const json: ArgumentType<any> = {
  name: "json",
  parse(argName: string, strValue: string): any {
    try {
      return JSON.parse(strValue);
    } catch (error) {
      throw new BuidlerError(
        ERRORS.ARGUMENTS.INVALID_JSON_ARGUMENT,
        {
          param: argName,
          error: error.message
        },
        error
      );
    }
  }
};
