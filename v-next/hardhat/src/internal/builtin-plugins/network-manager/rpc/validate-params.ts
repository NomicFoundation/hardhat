import type { ZodType } from "zod";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

export function validateParams<TypesT extends ReadonlyArray<ZodType<any>>>(
  params: any[],
  ...types: TypesT
): {
  [i in keyof TypesT]: TypesT[i] extends ZodType<infer TypeT> ? TypeT : never;
} {
  if (types === undefined && params.length > 0) {
    throw new HardhatError(
      HardhatError.ERRORS.NETWORK.WRONG_VALIDATION_PARAMS,
      {
        reason: `No argument was expected and got ${params.length}`,
      },
    );
  }

  let optionalParams = 0;
  for (let i = types.length - 1; i >= 0; i--) {
    if (types[i].isOptional() || types[i].isNullable()) {
      optionalParams += 1;
    } else {
      break;
    }
  }

  if (optionalParams === 0) {
    if (params.length !== types.length) {
      throw new HardhatError(
        HardhatError.ERRORS.NETWORK.WRONG_VALIDATION_PARAMS,
        {
          reason: `Expected exactly ${types.length} arguments and got ${params.length}`,
        },
      );
    }
  } else {
    if (
      params.length > types.length ||
      params.length < types.length - optionalParams
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.NETWORK.WRONG_VALIDATION_PARAMS,
        {
          reason: `Expected between ${types.length - optionalParams} and ${
            types.length
          } arguments and got ${params.length}`,
        },
      );
    }
  }

  const decoded: any[] = [];
  for (let i = 0; i < types.length; i++) {
    const res = types[i].parse(params[i]);
    decoded.push(res);
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TypeScript can't infer the complex return type
  return decoded as any;
}
