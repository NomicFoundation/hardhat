/* eslint-disable no-restricted-syntax -- TODO */

import type * as t from "io-ts";

import { PathReporter } from "io-ts/lib/PathReporter.js";

export function validateParams<
  TypesT extends ReadonlyArray<t.Type<any, any, any>>,
>(
  params: any[],
  ...types: TypesT
): {
  [i in keyof TypesT]: TypesT[i] extends t.Type<infer TypeT, any, any>
    ? TypeT
    : never;
} {
  if (types === undefined && params.length > 0) {
    throw new Error(`No argument was expected and got ${params.length}`);
  }

  let optionalParams = 0;
  for (let i = types.length - 1; i >= 0; i--) {
    if (types[i].is(undefined)) {
      optionalParams += 1;
    } else {
      break;
    }
  }

  if (optionalParams === 0) {
    if (params.length !== types.length) {
      throw new Error(
        `Expected exactly ${types.length} arguments and got ${params.length}`,
      );
    }
  } else {
    if (
      params.length > types.length ||
      params.length < types.length - optionalParams
    ) {
      throw new Error(
        `Expected between ${types.length - optionalParams} and ${
          types.length
        } arguments and got ${params.length}`,
      );
    }
  }

  const decoded: any[] = [];
  for (let i = 0; i < types.length; i++) {
    const result = types[i].decode(params[i]);

    if (result.isLeft()) {
      throw new Error(
        `Errors encountered in param ${i}: ${PathReporter.report(result).join(
          ", ",
        )}`,
      );
    }

    decoded.push(result.value);
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO
  return decoded as any;
}
