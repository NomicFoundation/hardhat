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
   * @param argName argument's name - used for context in case of error.
   * @param strValue argument's string value to be parsed.
   *
   * @throws BDLR301 if an invalid value is given.
   * @returns the parsed value.
   */
  parse(argName: string, strValue: string): T;

  /**
   * Check if argument value is of type <T>. Optional method.
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param argumentValue - value to be validated
   *
   * @throws BDLR301 if value is not of type <t>
   */
  validate?(argName: string, argumentValue: any): void;
}

/**
 * String type.
 *
 * Accepts any kind of string.
 */
export const string: ArgumentType<string> = {
  name: "string",
  parse: (argName, strValue) => strValue,
  /**
   * Check if argument value is of type "string"
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param value {any} argument's value to validate.
   *
   * @throws BDLR301 if value is not of type "string"
   */
  validate: (argName: string, value: any): void => {
    const isString = typeof value === "string";

    if (!isString) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: string.name,
      });
    }
  },
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
      type: "boolean",
    });
  },
  /**
   * Check if argument value is of type "boolean"
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param value {any} argument's value to validate.
   *
   * @throws BDLR301 if value is not of type "boolean"
   */
  validate: (argName: string, value: any): void => {
    const isBoolean = typeof value === "boolean";

    if (!isBoolean) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: boolean.name,
      });
    }
  },
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
        type: int.name,
      });
    }

    return Number(strValue);
  },
  /**
   * Check if argument value is of type "int"
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param value {any} argument's value to validate.
   *
   * @throws BDLR301 if value is not of type "int"
   */
  validate: (argName: string, value: any): void => {
    const isInt = Number.isInteger(value);
    if (!isInt) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: int.name,
      });
    }
  },
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
        type: float.name,
      });
    }

    return Number(strValue);
  },
  /**
   * Check if argument value is of type "float".
   * Both decimal and integer number values are valid.
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param value {any} argument's value to validate.
   *
   * @throws BDLR301 if value is not of type "number"
   */
  validate: (argName: string, value: any): void => {
    const isFloatOrInteger = typeof value === "number" && !isNaN(value);

    if (!isFloatOrInteger) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: float.name,
      });
    }
  },
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
          value: strValue,
        },
        error
      );
    }

    return strValue;
  },
  /**
   * Check if argument value is of type "inputFile"
   * File string validation succeeds if it can be parsed, ie. is a valid accessible file dir
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param value {any} argument's value to validate.
   *
   * @throws BDLR301 if value is not of type "inputFile"
   */
  validate: (argName: string, value: any): void => {
    try {
      inputFile.parse(argName, value);
    } catch (error) {
      // the input value is considered invalid, throw error.
      throw new BuidlerError(
        ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
        {
          value,
          name: argName,
          type: inputFile.name,
        },
        error
      );
    }
  },
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
          error: error.message,
        },
        error
      );
    }
  },
  /**
   * Check if argument value is of type "json". We consider everything except
   * undefined to be json.
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param value {any} argument's value to validate.
   *
   * @throws BDLR301 if value is not of type "json"
   */
  validate: (argName: string, value: any): void => {
    if (value === undefined) {
      throw new BuidlerError(ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
        value,
        name: argName,
        type: json.name,
      });
    }
  },
};
