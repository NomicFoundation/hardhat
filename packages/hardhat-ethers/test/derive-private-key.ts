import type {
  EdrNetworkHDAccountsConfig,
  HttpNetworkHDAccountsConfig,
} from "hardhat/types/config";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { derivePrivateKeys } from "../src/internal/signers/derive-private-key.js";

const MNEMONIC =
  "couch hunt wisdom giant regret supreme issue sing enroll ankle type husband";

function hdAccounts(
  path: string,
): EdrNetworkHDAccountsConfig | HttpNetworkHDAccountsConfig {
  const accounts = {
    mnemonic: { get: async () => MNEMONIC },
    passphrase: { get: async () => "" },
    count: 1,
    initialIndex: 0,
    path,
  };

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- test stub: only the fields read by derivePrivateKeys are provided */
  return accounts as unknown as HttpNetworkHDAccountsConfig;
}

describe("derivePrivateKeys", () => {
  it("should derive a key for a valid path", async () => {
    const [privateKey] = await derivePrivateKeys(hdAccounts("m/44'/60'/0'/0"));

    assert.match(privateKey, /^0x[0-9a-f]{64}$/);
  });

  it("should reject malformed paths containing a stray colon", async () => {
    await assertRejectsWithHardhatError(
      derivePrivateKeys(hdAccounts("m:/44'/60'/0'/0")),
      HardhatError.ERRORS.CORE.NETWORK.INVALID_HD_PATH,
      { path: "m:/44'/60'/0'/0" },
    );

    await assertRejectsWithHardhatError(
      derivePrivateKeys(hdAccounts("m/44':/60'/0'/0")),
      HardhatError.ERRORS.CORE.NETWORK.INVALID_HD_PATH,
      { path: "m/44':/60'/0'/0" },
    );
  });
});
