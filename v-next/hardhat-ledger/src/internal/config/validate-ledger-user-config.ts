import type { HardhatUserConfig } from "hardhat/config";
import type { HardhatUserConfigValidationError } from "hardhat/types/hooks";

import {
  getUnprefixedHexString,
  isHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import { validateUserConfigZodType } from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

const addressSchema = z
  .string()
  .refine(
    (val) => isHexString(val) && getUnprefixedHexString(val).length === 40,
    {
      message:
        "Each ledger account must be a valid 42 character hexadecimal string",
    },
  );

const ledgerUserConfigSchema = z.object({
  ledgerAccounts: z.array(addressSchema).optional(),
  ledgerOptions: z
    .object({
      derivationFunction: z.function().optional(),
    })
    .optional(),
});

export async function validateLedgerUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  if (userConfig.networks === undefined) {
    return [];
  }

  const networksErrors = [];

  for (const [networkName, network] of Object.entries(userConfig.networks)) {
    const errors = validateUserConfigZodType(
      {
        ledgerAccounts: network.ledgerAccounts,
        ledgerOptions: network.ledgerOptions,
      },
      ledgerUserConfigSchema,
    ).map((err) => {
      err.message = `network "${networkName}" - ${err.message}`;
      return err;
    });

    networksErrors.push(...errors);
  }

  return networksErrors;
}
