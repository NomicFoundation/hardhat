import { assert } from "chai";
import {
  bufferToHex,
  privateToAddress,
  toChecksumAddress,
} from "@nomicfoundation/ethereumjs-util";

import { deriveKeyFromMnemonicAndPath } from "../../../src/internal/util/keys-derivation";

describe("Keys derivation", function () {
  describe("deriveKeyFromMnemonicAndPath", function () {
    it("Should derive the right keys", function () {
      const mnemonic =
        "atom exist unusual amazing find assault penalty wall curve lunar promote cattle";
      const path = "m/123/123'";

      const derivedPk = deriveKeyFromMnemonicAndPath(mnemonic, path, "");
      const address = bufferToHex(privateToAddress(derivedPk!));

      assert.equal(
        toChecksumAddress(address),
        "0x9CFE3206BD8beDC01c1f04E644eCd3e96a16F095"
      );

      const passphrase = "it is a secret";
      const derivedPkWithPass = deriveKeyFromMnemonicAndPath(
        mnemonic,
        path,
        passphrase
      );
      const addressWithPass = bufferToHex(privateToAddress(derivedPkWithPass!));

      assert.equal(
        toChecksumAddress(addressWithPass),
        "0xCD0062c186566742271bD083e5E92402391C03B2"
      );
    });
  });
});
