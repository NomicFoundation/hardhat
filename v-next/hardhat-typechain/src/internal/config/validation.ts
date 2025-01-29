import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";
import type { HardhatUserConfigValidationError } from "@ignored/hardhat-vnext-zod-utils";

import { validateUserConfigZodType } from "@ignored/hardhat-vnext-zod-utils";
import { z } from "zod";

const typechainUserConfigSchema = z
  .object({
    outDir: z
      .string({
        message:
          "It should be an absolute path specifying where to store the generated types",
      })
      .optional(),
    alwaysGenerateOverloads: z.boolean().optional(),
    dontOverrideCompile: z.boolean().optional(),
    discriminateTypes: z.boolean().optional(),
    tsNocheck: z.boolean().optional(),
  })
  .optional();

export async function validateTypechainUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(
    userConfig.typechain,
    typechainUserConfigSchema,
  );
}
