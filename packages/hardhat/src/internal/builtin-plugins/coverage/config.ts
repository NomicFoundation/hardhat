import type { HardhatUserConfig } from "../../../config.js";
import type { CoverageConfig } from "../../../types/config.js";
import type { HardhatUserConfigValidationError } from "../../../types/hooks.js";

import { validateUserConfigZodType } from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

const userConfigType = z.object({
  coverage: z
    .object({
      skipFiles: z.array(z.string()).optional(),
    })
    .optional(),
});

export function validateCoverageUserConfig(
  userConfig: unknown,
): HardhatUserConfigValidationError[] {
  return validateUserConfigZodType(userConfig, userConfigType);
}

export function resolveCoverageConfig(
  userConfig: HardhatUserConfig,
): CoverageConfig {
  return {
    skipFiles: userConfig.coverage?.skipFiles ?? [],
  };
}
