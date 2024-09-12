import type { ZodTypeDef, ZodType } from "zod";

import { z } from "zod";

/**
 * We use `unknown` here to avoid a circular dependency between the Hardhat and
 * the Zod utils packages.
 */
export type HardhatUserConfigToValidate = unknown;

/**
 * For the same reason, we duplicate the type here.
 */
export interface HardhatUserConfigValidationError {
  path: Array<string | number>;
  message: string;
}

/**
 * A Zod untagged union type that returns a custom error message if the value
 * is missing or invalid.
 */
export const unionType = (
  types: Parameters<typeof z.union>[0],
  errorMessage: string,
) =>
  // eslint-disable-next-line no-restricted-syntax -- This is the only place we allow z.union
  z.union(types, {
    errorMap: () => ({
      message: errorMessage,
    }),
  });

/**
 * A Zod union type that allows you to provide hints to Zod about which of the
 * type variant it should use.
 *
 * It receives an array of tuples, where each tuple contains a predicate
 * function and a ZodType. The predicate function takes the data to be parsed
 * and returns a boolean. If the predicate function returns true, the ZodType
 * is used to parse the data.
 *
 * If none of the predicates returns true, an error is added to the context
 * with the noMatchMessage message.
 *
 * For example, you can use this to conditionally validate a union type based
 * on the values `typeof` and its fields:
 *
 * @example
 * ```ts
 * const fooType = conditionalUnionType(
 *   [
 *     [(data) => typeof data === "string", z.string()],
 *     [(data) => Array.isArray(data), z.array(z.string()).nonempty()],
 *     [(data) => isObject(data), z.object({foo: z.string().optional()})]
 *   ],
 *   "Expected a string, an array of strings, or an object with an optional 'foo' property",
 * );
 * ```
 *
 * @param cases An array of tuples of a predicate function and a ZodType.
 * @param noMatchMessage THe error message to return if none of the predicates
 * returns true.
 * @returns The conditional union ZodType.
 */
export const conditionalUnionType = (
  cases: Array<[predicate: (data: unknown) => boolean, zodType: ZodType<any>]>,
  noMatchMessage: string,
) =>
  z.any().superRefine((data, ctx) => {
    const matchingCase = cases.find(([predicate]) => predicate(data));
    if (matchingCase === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: noMatchMessage,
      });
      return;
    }

    const zodeType = matchingCase[1];

    const parsedData = zodeType.safeParse(data);
    if (parsedData.error !== undefined) {
      for (const issue of parsedData.error.issues) {
        ctx.addIssue(issue);
      }
    }
  });

/**
 * Creates a Zod type to validate that a field of an object doesn't exist.
 *
 * This is useful when you have a {@link conditionalUnionType} that represents
 * a union of object types with incompatible fields between each other.
 *
 * @example
 * ```ts
 * const type = z.object({
 *   foo: z.string(),
 *   bar: unexpectedFieldType("This field is incompatible with `foo`"),
 * });
 * ```
 *
 * @param errorMessage The error message to display if the field is present.
 * @returns A Zod type that validates that a field of an object doesn't exist.
 */
export const incompatibleFieldType = (errorMessage = "Unexpected field") =>
  z
    .never({
      errorMap: () => ({
        message: errorMessage,
      }),
    })
    .optional();

/**
 * A Zod type to validate Hardhat's ConfigurationVariable objects.
 */
export const configurationVariableType = z.object({
  _type: z.literal("ConfigurationVariable"),
  name: z.string(),
});

/**
 * A Zod type to validate Hardhat's SensitiveString values.
 */
export const sensitiveStringType = conditionalUnionType(
  [
    [(data) => typeof data === "string", z.string()],
    [(data) => typeof data === "object", configurationVariableType],
  ],
  "Expected a string or a Configuration Variable",
);

/**
 * A Zod type to validate Hardhat's SensitiveString values that expect a URL.
 */
export const sensitiveUrlType = conditionalUnionType(
  [
    [(data) => typeof data === "string", z.string().url()],
    [(data) => typeof data === "object", configurationVariableType],
  ],
  "Expected a URL or a Configuration Variable",
);

/**
 * A function to validate the user's configuration object against a Zod type.
 *
 * Note: The zod type MUST represent the HardhatUserConfig type, or a subset of
 * it. You shouldn't use this function to validate their fields individually.
 * The reason for this is that the paths of the validation errors must start
 * from the root of the config object, so that they are correctly reported to
 * the user.
 */
export function validateUserConfigZodType<
  Output,
  Def extends ZodTypeDef = ZodTypeDef,
  Input = Output,
>(
  hardhatUserConfig: HardhatUserConfigToValidate,
  configType: ZodType<Output, Def, Input>,
): HardhatUserConfigValidationError[] {
  const result = configType.safeParse(hardhatUserConfig);

  if (result.success) {
    return [];
  } else {
    return result.error.errors.map((issue) => ({
      path: issue.path,
      message: issue.message,
    }));
  }
}
