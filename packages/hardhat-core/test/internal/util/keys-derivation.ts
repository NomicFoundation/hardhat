import {
  bytesToHex as bufferToHex,
  privateToAddress,
  toChecksumAddress,
} from "@ethereumjs/util";
import { assert } from "chai";

import { deriveKeyFromMnemonicAndPath } from "../../../src/internal/util/keys-derivation";

const MNEMONIC =
  "atom exist unusual amazing find assault penalty wall curve lunar promote cattle";
const ADDRESS = "0x9CFE3206BD8beDC01c1f04E644eCd3e96a16F095";
const PASSPHRASE = "it is a secret";
const ADDRESS_WITH_PASS = "0xCD0062c186566742271bD083e5E92402391C03B2";

describe("Keys derivation", function () {
  describe("deriveKeyFromMnemonicAndPath", function () {
    it("Should derive the right keys", function () {
      const path = "m/123/123'";

      const derivedPk = deriveKeyFromMnemonicAndPath(MNEMONIC, path, "");
      const address = bufferToHex(privateToAddress(derivedPk!));

      assert.equal(toChecksumAddress(address), ADDRESS);

      const derivedPkWithPass = deriveKeyFromMnemonicAndPath(
        MNEMONIC,
        path,
        PASSPHRASE
      );
      const addressWithPass = bufferToHex(privateToAddress(derivedPkWithPass!));

      assert.equal(toChecksumAddress(addressWithPass), ADDRESS_WITH_PASS);
    });

    it("Should derive the right keys from '\n{mnemonic}'", function () {
      const mnemonic = `\n${MNEMONIC}`;
      const path = "m/123/123'";

      const derivedPk = deriveKeyFromMnemonicAndPath(mnemonic, path, "");
      const address = bufferToHex(privateToAddress(derivedPk!));

      assert.equal(toChecksumAddress(address), ADDRESS);

      const derivedPkWithPass = deriveKeyFromMnemonicAndPath(
        mnemonic,
        path,
        PASSPHRASE
      );
      const addressWithPass = bufferToHex(privateToAddress(derivedPkWithPass!));

      assert.equal(toChecksumAddress(addressWithPass), ADDRESS_WITH_PASS);
    });
  });
  it("Should derive the right keys from '{mnemonic}\n'", function () {
    const mnemonic = `${MNEMONIC}\n`;
    const path = "m/123/123'";

    const derivedPk = deriveKeyFromMnemonicAndPath(mnemonic, path, "");
    const address = bufferToHex(privateToAddress(derivedPk!));

    assert.equal(toChecksumAddress(address), ADDRESS);

    const derivedPkWithPass = deriveKeyFromMnemonicAndPath(
      mnemonic,
      path,
      PASSPHRASE
    );
    const addressWithPass = bufferToHex(privateToAddress(derivedPkWithPass!));

    assert.equal(toChecksumAddress(addressWithPass), ADDRESS_WITH_PASS);
  });
  it("Should derive the right keys from ' {mnemonic}'", function () {
    const mnemonic = ` ${MNEMONIC}`;
    const path = "m/123/123'";

    const derivedPk = deriveKeyFromMnemonicAndPath(mnemonic, path, "");
    const address = bufferToHex(privateToAddress(derivedPk!));

    assert.equal(toChecksumAddress(address), ADDRESS);

    const derivedPkWithPass = deriveKeyFromMnemonicAndPath(
      mnemonic,
      path,
      PASSPHRASE
    );
    const addressWithPass = bufferToHex(privateToAddress(derivedPkWithPass!));

    assert.equal(toChecksumAddress(addressWithPass), ADDRESS_WITH_PASS);
  });
  it("Should derive the right keys from '{mnemonic} '", function () {
    const mnemonic = `${MNEMONIC} `;
    const path = "m/123/123'";

    const derivedPk = deriveKeyFromMnemonicAndPath(mnemonic, path, "");
    const address = bufferToHex(privateToAddress(derivedPk!));

    assert.equal(toChecksumAddress(address), ADDRESS);

    const derivedPkWithPass = deriveKeyFromMnemonicAndPath(
      mnemonic,
      path,
      PASSPHRASE
    );
    const addressWithPass = bufferToHex(privateToAddress(derivedPkWithPass!));

    assert.equal(toChecksumAddress(addressWithPass), ADDRESS_WITH_PASS);
  });
});
