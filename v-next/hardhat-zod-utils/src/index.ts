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
 *
 * WARNING: In most cases you should use {@link conditionalUnionType} instead.
 *
 * This union type is valid for simple cases, where the union is made of
 * primitive or simple types.
 *
 * If you have a type that's complex, like an object or array, you must use
 * {@link conditionalUnionType}.
 */
// TODO: improve the return type of this function to be more specific
export const unionType = (
  types: Parameters<typeof z.union>[0],
  errorMessage: string,
) =>
  // NOTE: The reason we use `z.any().superRefine` instead of `z.union` is that
  // we found a bug with the `z.union` method that causes it to return a
  // "deeper" validation error, when we expected the `errorMessage`.
  // See: https://github.com/colinhacks/zod/issues/2940#issuecomment-2380836931
  z.any().superRefine((val, ctx) => {
    if (types.some((t) => t.safeParse(val).success)) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: errorMessage,
    });
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
// TODO: improve the return type of this function to be more specific
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
 * const typeWithFoo = z.object({
 *   foo: z.string(),
 *   bar: unexpecteddFieldType("This field is incompatible with `foo`"),
 * });
 *
 * const typeWithBar = z.object({
 *   bar: z.string(),
 *   foo: unexpecteddFieldType("This field is incompatible with `bar`"),
 * });
 *
 * const union = conditionalUnionType(
 *   [
 *     [(data) => isObject(data) && "foo" in data, typeWithFoo],
 *     [(data) => isObject(data) && "bar" in data, typeWithBar],
 *   ],
 *   "Expected an object with either a `foo` or a `bar` field",
 * );
 * ```
 *
 * @param errorMessage The error message to display if the field is present.
 * @returns A Zod type that validates that a field of an object doesn't exist.
 */
export const incompatibleFieldType = (errorMessage = "Unexpectedd field") =>
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
export const configurationVariableSchema = z.object({
  _type: z.literal("ConfigurationVariable"),
  name: z.string(),
});

/**
 * A Zod type to validate Hardhat's ResolvedConfigurationVariable objects.
 */
export const resolvedConfigurationVariableSchema = z.object({
  _type: z.literal("ResolvedConfigurationVariable"),
  get: z.function(),
  getUrl: z.function(),
  getBigInt: z.function(),
  getHexString: z.function(),
});

/**
 * A Zod type to validate Hardhat's SensitiveString values.
 */
export const sensitiveStringSchema: z.ZodType<
  string | z.infer<typeof configurationVariableSchema>
> = unionType(
  [z.string(), configurationVariableSchema],
  "Expected a string or a Configuration Variable",
);

/**
 * A Zod type to validate Hardhat's SensitiveString values that expect a URL.
 *
 * TODO: The custom error message in the unionType function doesn't work
 * correctly when using string().url() for validation, see:
 * https://github.com/colinhacks/zod/issues/2940
 * As a workaround, we provide the error message directly in the url() call.
 * We should remove this when the issue is fixed.
 */
export const sensitiveUrlSchema: z.ZodType<
  string | z.infer<typeof configurationVariableSchema>
> = unionType(
  [
    z.string().url("Expected a URL or a Configuration Variable"),
    configurationVariableSchema,
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
