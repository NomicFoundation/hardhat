import type { ResolvedConfigurationVariable } from "../../../../types/config.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isPrivateKey } from "@nomicfoundation/hardhat-utils/eth";

import { getConfigurationVariableDescription } from "../../../core/configuration-variables.js";

/**
 * Returns the value of a configuration variable that holds a private key,
 * normalized like `getHexString` does.
 *
 * @throws a HardhatError if the value isn't a valid private key.
 */
export async function getPrivateKey(
  variable: ResolvedConfigurationVariable,
): Promise<string> {
  const privateKey = await variable.getHexString();

  if (!isPrivateKey(privateKey)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_VARIABLE_PRIVATE_KEY,
      { configVariable: getConfigurationVariableDescription(variable) },
    );
  }

  return privateKey;
}
