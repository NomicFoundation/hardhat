import * as fs from "fs";
import fsExtra from "fs-extra";

import { BuidlerError } from "../errors";
import { ERRORS } from "../errors-list";

export type ArgumentTypeName =
  | "boolean"
  | "int"
  | "float"
  | "string"
  | "json"
  | "inputFile"
  | "array";

/**
 * Provides an interface for every valid task argument type.
 */
export interface ArgumentType<T> {
  /**
   * Type's name.
   */
  name: ArgumentTypeName;

  /**
   * Parses strValue. This function MUST throw BDLR301 if it
   * can parse the given value.
   *
   * @param argName argument's name - used for context in case of error.
   * @param strValue argument's string value to be parsed.
   *
   * @throws BDLR301 if an invalid value is given.
   * @returns the parsed value.
   */
  parse(argName: string, strValue: string): T;

  /**
   * Check if argument value is of type <T>
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param value {any} argument's value to validate.
   *
   * @throws BDLR301 if value is not of type <t>
   */
  validate(argName: string, value: any): void;
}

/**
 * String type.
 *
 * Accepts any kind of string.
 */
export const string: ArgumentType<string> = {
  name: "string",
  parse: (argName, strValue) => strValue,
  validate: (argName: string, value: any): void => {
    const type = "string";
    if (typeof value !== type) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type
      });
    }
  }
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
  },
  validate: (argName: string, value: any): void => {
    const type = "boolean";
    if (typeof value !== type) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type
      });
    }
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
        type: int.name
      });
    }

    return Number(strValue);
  },
  validate: (argName: string, value: any): void => {
    if (!Number.isInteger(value)) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: int.name
      });
    }
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
        type: float.name
      });
    }

    return Number(strValue);
  },
  validate: (argName: string, value: any): void => {
    const isFloat = Math.floor(value) !== value;
    if (!isFloat) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: float.name
      });
    }
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
  },
  /**
   * File string validation succeeds if it can be parsed, ie. is a valid accessible file dir*
   */
  validate: (argName: string, value: any): void => {
    inputFile.parse(argName, value);
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
  },
  /**
   *   'json' value validation succeeds if it is of "object" map-like {} type,
   *   this excludes 'null', function, date, regexp, etc.
   */
  validate: (argName: string, value: any): void => {
    const isJsonValue =
      Object.prototype.toString.call(value) === "[object Object]";

    if (!isJsonValue) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: json.name
      });
    }
  }
};

/**
 * Array type.
 * Accepts an array of strings or numbers.
 * @throws BDLR301
 */
export const array: ArgumentType<any[]> = {
  name: "array",
  parse(argName: string, strValue: string): any[] {
    let parsed: any[] | undefined;
    try {
      parsed = JSON.parse(strValue);
    } catch (error) {
      // do nothing here (will throw an error below)
    }
    if (parsed === undefined || !Array.isArray(parsed)) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value: strValue,
        name: argName,
        type: array.name
      });
    }
    return parsed;
  },
  validate: (argName: string, value: any): void => {
    const isArray = Object.prototype.toString.call(value) === "[object Array]";

    if (!isArray) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: array.name
      });
    }
  }
};
