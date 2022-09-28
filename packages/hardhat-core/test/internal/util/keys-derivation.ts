import { assert } from "chai";
import {
  bufferToHex,
  privateToAddress,
  toChecksumAddress,
} from "@nomicfoundation/ethereumjs-util";

import { deriveKeyFromMnemonicAndPath } from "../../../src/internal/util/keys-derivation";

const MNEMONIC =
  "atom exist unusual amazing find assault penalty wall curve lunar promote cattle";

describe("Keys derivation", function () {
  describe("deriveKeyFromMnemonicAndPath", function () {
    it("Should derive the right keys", function () {
      const path = "m/123/123'";

      const derivedPk = deriveKeyFromMnemonicAndPath(MNEMONIC, path, "");
      const address = bufferToHex(privateToAddress(derivedPk!));

      assert.equal(
        toChecksumAddress(address),
        "0x9CFE3206BD8beDC01c1f04E644eCd3e96a16F095"
      );

      const passphrase = "it is a secret";
      const derivedPkWithPass = deriveKeyFromMnemonicAndPath(
        MNEMONIC,
        path,
        passphrase
      );
      const addressWithPass = bufferToHex(privateToAddress(derivedPkWithPass!));

      assert.equal(
        toChecksumAddress(addressWithPass),
        "0xCD0062c186566742271bD083e5E92402391C03B2"
      );
    });

    it("Should not derive the wrong keys that is added '\\n'", function () {
      const mnemonic = `${MNEMONIC}\n`;
      const path = "m/123/123'";

      assert.throws(() => {
        deriveKeyFromMnemonicAndPath(mnemonic, path, "");
      }, Error);
    });
  });
});
