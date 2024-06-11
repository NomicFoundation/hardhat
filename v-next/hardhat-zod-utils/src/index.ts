import type { HardhatUserConfig } from "@nomicfoundation/hardhat-core/config";
import type { HardhatUserConfigValidationError } from "@nomicfoundation/hardhat-core/types/hooks";
import type { ZodType, ZodTypeDef, ZodIssue } from "zod";

import { z } from "zod";

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
export const sensitiveStringType = z.union([
  z.string(),
  configurationVariableType,
]);

/**
 * A function to validate the user's configuration object against a Zod type.
 */
export async function validateUserConfigZodType<
  Output,
  Def extends ZodTypeDef = ZodTypeDef,
  Input = Output,
>(
  config: HardhatUserConfig,
  configType: ZodType<Output, Def, Input>,
): Promise<HardhatUserConfigValidationError[]> {
  const result = await configType.safeParseAsync(config);

  if (result.success) {
    return [];
  } else {
    return result.error.errors.map((issue) =>
      zodIssueToValidationError(config, configType, issue),
    );
  }
}

function zodIssueToValidationError<
  Output,
  Def extends ZodTypeDef = ZodTypeDef,
  Input = Output,
>(
  _config: HardhatUserConfig,
  _configType: ZodType<Output, Def, Input>,
  zodIssue: ZodIssue,
): HardhatUserConfigValidationError {
  // TODO: `invalid_union` errors are too ambiguous. How can we improve them?
  //  This is just a sketch: not perfect nor tested.
  if (zodIssue.code === "invalid_union") {
    return {
      path: zodIssue.path,
      message: `Expected ${zodIssue.unionErrors
        .flatMap((ue) => ue.errors)
        .map((zi) => {
          if (zi.code === "invalid_type") {
            return zi.expected;
          }

          return "(please see the docs)";
        })
        .join(" or ")}`,
    };
  }

  return { path: zodIssue.path, message: zodIssue.message };
}
