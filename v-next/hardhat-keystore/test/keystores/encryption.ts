import type {
  EncryptedData,
  EncryptedKeystore,
} from "../../src/internal/keystores/encryption.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils";
import { assertThrows } from "@nomicfoundation/hardhat-test-utils";

import {
  addSecretToKeystore,
  createEmptyEncryptedKeystore,
  createMasterKey,
  DATA_ENCRYPTION_ALGORITHM,
  DATA_ENCRYPTION_IV_LENGTH_BYTES,
  DATA_ENCRYPTION_KEY_LENGTH_BITS,
  DecryptionError,
  decryptSecret,
  decryptUtf8String,
  deriveMasterKeyFromKeystore,
  deserializeEncryptedData,
  deterministicJsonStringify,
  encryptUtf8String,
  generateEncryptedKeystoreHmac,
  HMAC_ALGORITHM,
  HMAC_KEY_LENGTH_BITS,
  InvalidHmacError,
  HmacKeyDecryptionError,
  KEY_DERIVARION_ALGORITHM,
  KEY_DERIVATION_PARAM_N,
  KEY_DERIVATION_PARAM_P,
  KEY_DERIVATION_PARAM_R,
  KEY_DERIVATION_SALT_LENGTH_BYTES,
  KEYSTORE_VERSION,
  MASTER_KEY_LENGTH_BITS,
  PASSWORD_NORMALIZATION_FORM,
  removeSecretFromKeystore,
  SecretNotFoundError,
  serializeEncryptedData,
  UnsupportedTypeInDeterministicJsonError,
  validateHmac,
  doesKeyExist,
} from "../../src/internal/keystores/encryption.js";

describe("Serialization utilities", () => {
  describe("serializeEncryptedData and deserializeEncryptedData", () => {
    it("Should allow a round trip", () => {
      const encryptedData: EncryptedData = {
        iv: new Uint8Array([
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        ]),
        cypherText: new Uint8Array([
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
        ]),
      };

      const serializedEncryptedData = serializeEncryptedData(encryptedData);

      const deserializedEncryptedData = deserializeEncryptedData(
        serializedEncryptedData,
      );

      assert.deepEqual(deserializedEncryptedData, encryptedData);

      const serializedEncryptedData2 = serializeEncryptedData(
        deserializedEncryptedData,
      );

      assert.deepEqual(serializedEncryptedData, serializedEncryptedData2);
    });
  });

  describe("deterministicJsonStringify", () => {
    it("deterministicJsonStringify sorts keys of a simple object", async () => {
      const obj = { b: "2", a: "1" };
      const result = deterministicJsonStringify(obj);
      assert.equal(result, '{"a":"1","b":"2"}');
    });

    it("deterministicJsonStringify sorts keys in nested objects", async () => {
      const obj = {
        b: { d: "4", c: "3" },
        a: "1",
      };
      const result = deterministicJsonStringify(obj);
      assert.equal(result, '{"a":"1","b":{"c":"3","d":"4"}}');
    });

    it("deterministicJsonStringify omits undefined properties", async () => {
      const obj = {
        a: undefined,
        b: "hello",
      };
      const result = deterministicJsonStringify(obj);
      // JSON.stringify omits properties whose values are undefined.
      assert.equal(result, '{"b":"hello"}');
    });

    it("deterministicJsonStringify serializes numbers correctly", async () => {
      const obj = { y: 1, x: 2 };
      const result = deterministicJsonStringify(obj);
      // Even if the input order is different, keys in the output should be sorted.
      assert.equal(result, '{"x":2,"y":1}');
    });

    it("deterministicJsonStringify throws for boolean values", async () => {
      const obj = { a: true };
      assertThrows(
        () => deterministicJsonStringify(obj),
        (e) => e instanceof UnsupportedTypeInDeterministicJsonError,
      );
    });

    it("deterministicJsonStringify throws for array values", async () => {
      const obj = { a: [1, 2, 3] };
      assertThrows(
        () => deterministicJsonStringify(obj),
        (e) => e instanceof UnsupportedTypeInDeterministicJsonError,
      );
    });

    it("deterministicJsonStringify throws for null values", async () => {
      const obj = { a: null };
      assertThrows(
        () => deterministicJsonStringify(obj),
        (e) => e instanceof UnsupportedTypeInDeterministicJsonError,
      );
    });
  });
});

describe("Generic crypto utils", () => {
  describe("encryptUtf8String and decryptUtf8String", () => {
    it("Should allow a round trip", () => {
      const encryptionKey = randomBytes(DATA_ENCRYPTION_KEY_LENGTH_BITS / 8);
      const value = "non ascii secret: niño";

      const encryptedData = encryptUtf8String({
        encryptionKey,
        value,
      });

      const decryptedValue = decryptUtf8String({
        encryptionKey,
        data: encryptedData,
      });

      assert.equal(decryptedValue, value);
    });

    it("Should use a different iv for each encryption", () => {
      const encryptionKey = randomBytes(DATA_ENCRYPTION_KEY_LENGTH_BITS / 8);
      const value = "non ascii secret: niño";

      const encryptedData1 = encryptUtf8String({
        encryptionKey,
        value,
      });
      const encryptedData2 = encryptUtf8String({
        encryptionKey,
        value,
      });

      assert.notDeepEqual(encryptedData1.iv, encryptedData2.iv);
      assert.notDeepEqual(encryptedData1.cypherText, encryptedData2.cypherText);
    });

    it("Should use the right size for the iv", () => {
      const encryptionKey = randomBytes(DATA_ENCRYPTION_KEY_LENGTH_BITS / 8);
      const value = "non ascii secret: niño";

      const encryptedData = encryptUtf8String({
        encryptionKey,
        value,
      });

      assert.equal(encryptedData.iv.length, DATA_ENCRYPTION_IV_LENGTH_BYTES);
    });

    it("Should throw if it fails to decrypt", () => {
      const encryptionKey = randomBytes(DATA_ENCRYPTION_KEY_LENGTH_BITS / 8);
      const value = "non ascii secret: niño";

      const encryptedData = encryptUtf8String({
        encryptionKey,
        value,
      });

      assertThrows(
        () =>
          decryptUtf8String({
            encryptionKey,
            data: {
              iv: encryptedData.iv,
              cypherText: Buffer.concat([
                encryptedData.cypherText,
                Buffer.from("00", "hex"),
              ]),
            },
          }),
        (e) => e instanceof DecryptionError,
      );

      const mutatedIv = Buffer.from(encryptedData.iv);
      mutatedIv[0] = 0;
      mutatedIv[1] = 0;
      mutatedIv[2] = 0;

      assertThrows(
        () =>
          decryptUtf8String({
            encryptionKey,
            data: {
              iv: mutatedIv,
              cypherText: encryptedData.cypherText,
            },
          }),
        (e) => e instanceof DecryptionError,
      );

      const mutatedEncryptionKey = Buffer.from(encryptionKey);
      mutatedEncryptionKey[0] = 0;
      mutatedEncryptionKey[1] = 0;
      mutatedEncryptionKey[2] = 0;

      assertThrows(
        () =>
          decryptUtf8String({
            encryptionKey: mutatedEncryptionKey,
            data: encryptedData,
          }),
        (e) => e instanceof DecryptionError,
      );
    });
  });
});

function createTestEmptyKeystore(password = "viva la ethereum"): {
  emptyKeystore: EncryptedKeystore;
  masterKey: Uint8Array;
  salt: Uint8Array;
  password: string;
} {
  const { salt, masterKey } = createMasterKey({ password });

  const emptyKeystore = createEmptyEncryptedKeystore({
    masterKey,
    salt,
  });

  return { emptyKeystore, masterKey, salt, password };
}

describe("Keystore primitives", () => {
  const testEmptyKeystore = createTestEmptyKeystore();

  describe("createMasterKey", () => {
    it("Should create new master key and salt every time", () => {
      const password = "viva la ethereum";
      const { salt, masterKey } = createMasterKey({ password });
      const { salt: salt2, masterKey: masterKey2 } = createMasterKey({
        password,
      });

      assert.notDeepEqual(masterKey, masterKey2);
      assert.notDeepEqual(salt, salt2);
    });

    it("Should use the right size for the salt and master key", () => {
      const password = "viva la ethereum";
      const { salt, masterKey } = createMasterKey({ password });

      assert.equal(salt.length, KEY_DERIVATION_SALT_LENGTH_BYTES);
      assert.equal(masterKey.length, MASTER_KEY_LENGTH_BITS / 8);
    });
  });

  describe("Empty keystore creation", () => {
    it("Should use the provided master key and salt", () => {
      const { emptyKeystore, masterKey, salt, password } = testEmptyKeystore;

      // We decrypt the data encryption key and hmac key to make sure they are
      // encrypted with the master key.
      const dataEncryptionKey = hexToBytes(
        decryptUtf8String({
          encryptionKey: masterKey,
          data: deserializeEncryptedData(emptyKeystore.dataEncryptionKey),
        }),
      );

      const hmacKey = hexToBytes(
        decryptUtf8String({
          encryptionKey: masterKey,
          data: deserializeEncryptedData(emptyKeystore.hmacKey),
        }),
      );

      assert.equal(
        dataEncryptionKey.length,
        DATA_ENCRYPTION_KEY_LENGTH_BITS / 8,
      );

      assert.equal(hmacKey.length, HMAC_KEY_LENGTH_BITS / 8);

      // We validate that the salt is the same as the one provided
      assert.equal(
        emptyKeystore.crypto.masterKeyDerivation.salt,
        bytesToHex(salt),
      );

      // We derive the master key from the password and the salt and it should
      // match the original master key
      const masterKey2 = deriveMasterKeyFromKeystore({
        password,
        encryptedKeystore: emptyKeystore,
      });

      assert.deepEqual(masterKey, masterKey2);
    });

    it("Should set the right version and encryption values", () => {
      const { emptyKeystore, salt } = testEmptyKeystore;

      assert.equal(emptyKeystore.version, KEYSTORE_VERSION);
      assert.deepEqual(emptyKeystore.crypto.masterKeyDerivation, {
        algorithm: KEY_DERIVARION_ALGORITHM,
        paramN: KEY_DERIVATION_PARAM_N,
        paramP: KEY_DERIVATION_PARAM_P,
        paramR: KEY_DERIVATION_PARAM_R,
        unicodeNormalizationForm: PASSWORD_NORMALIZATION_FORM,
        keyLength: MASTER_KEY_LENGTH_BITS,
        salt: bytesToHex(salt),
      });

      assert.deepEqual(emptyKeystore.crypto.encryption, {
        algorithm: DATA_ENCRYPTION_ALGORITHM,
        keyLength: DATA_ENCRYPTION_KEY_LENGTH_BITS,
      });

      assert.deepEqual(emptyKeystore.crypto.hmac, {
        algorithm: HMAC_ALGORITHM,
        keyLength: HMAC_KEY_LENGTH_BITS,
      });
    });

    it("Should create different data encryption keys every time", () => {
      const { emptyKeystore, salt, masterKey } = testEmptyKeystore;

      const emptyKeystore2 = createEmptyEncryptedKeystore({
        masterKey,
        salt,
      });

      assert.notDeepEqual(
        emptyKeystore.dataEncryptionKey,
        emptyKeystore2.dataEncryptionKey,
      );
    });

    it("Should create different hmac keys every time", () => {
      const { emptyKeystore, salt, masterKey } = testEmptyKeystore;

      const emptyKeystore2 = createEmptyEncryptedKeystore({
        masterKey,
        salt,
      });

      assert.notDeepEqual(emptyKeystore.hmacKey, emptyKeystore2.hmacKey);
    });

    it("Should create a valid hmac", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      const hmac = generateEncryptedKeystoreHmac({
        masterKey,
        encryptedKeystore: emptyKeystore,
      });

      assert.deepEqual(hmac, hexToBytes(emptyKeystore.hmac));
    });

    it("Should have no secrets", () => {
      const { emptyKeystore } = testEmptyKeystore;

      assert.deepEqual(emptyKeystore.secrets, {});
    });
  });

  describe("deriveMasterKeyFromKeystore", () => {
    it("Should derive the master key from the keystore", () => {
      const { emptyKeystore, masterKey, password } = testEmptyKeystore;

      const derivedMasterKey = deriveMasterKeyFromKeystore({
        password,
        encryptedKeystore: emptyKeystore,
      });

      assert.deepEqual(derivedMasterKey, masterKey);
    });
  });

  describe("generateEncryptedKeystoreHmac", () => {
    it("Should generate the same hmac of an empty encrypted keystore every time", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      const hmac2 = generateEncryptedKeystoreHmac({
        masterKey,
        encryptedKeystore: emptyKeystore,
      });

      const hmac3 = generateEncryptedKeystoreHmac({
        masterKey,
        encryptedKeystore: emptyKeystore,
      });

      assert.deepEqual(hmac3, hmac2);
      assert.deepEqual(hmac3, hexToBytes(emptyKeystore.hmac));
      assert.deepEqual(hmac2, hexToBytes(emptyKeystore.hmac));
    });

    it("Should generate the same hmac of non empty encrypted keystore every time", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      const nonEmptyKeystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: emptyKeystore,
        key: "my-secret",
        value: "my-secret-value",
      });

      const hmac2 = generateEncryptedKeystoreHmac({
        masterKey,
        encryptedKeystore: nonEmptyKeystore,
      });

      const hmac3 = generateEncryptedKeystoreHmac({
        masterKey,
        encryptedKeystore: nonEmptyKeystore,
      });

      assert.deepEqual(hmac3, hmac2);
      assert.deepEqual(hmac3, hexToBytes(nonEmptyKeystore.hmac));
      assert.deepEqual(hmac2, hexToBytes(nonEmptyKeystore.hmac));
    });

    it("Should throw if the hmac key is corrupted", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      assertThrows(
        () =>
          generateEncryptedKeystoreHmac({
            masterKey,
            encryptedKeystore: {
              ...emptyKeystore,
              hmacKey: {
                iv: emptyKeystore.hmacKey.iv,
                cypherText: "0000000000" + emptyKeystore.hmac.slice(10),
              },
            },
          }),
        (e) => e instanceof HmacKeyDecryptionError,
      );
    });
  });

  describe("Adding secrets to keystore", () => {
    it("Should add multiple secrets to a keystore, modifying only the secrets and hmac, allowing to overwrite secrets by key, and generating different cyphertext and ivs for the same secret values", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      let previousKeystore = emptyKeystore;

      let newKeystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: previousKeystore,
        key: "my-secret",
        value: "my-secret-value",
      });

      assert.deepEqual(newKeystore.crypto, previousKeystore.crypto);
      assert.deepEqual(
        newKeystore.dataEncryptionKey,
        previousKeystore.dataEncryptionKey,
      );
      assert.deepEqual(newKeystore.hmacKey, previousKeystore.hmacKey);

      assert.notDeepEqual(newKeystore.hmac, previousKeystore.hmac);
      assert.notDeepEqual(newKeystore.secrets, previousKeystore.secrets);

      assert.ok(
        "my-secret" in newKeystore.secrets,
        "The secret should be present",
      );

      // Adding a new secret
      previousKeystore = newKeystore;
      newKeystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: previousKeystore,
        key: "my-secret-2",
        value: "my-secret-value-2",
      });

      assert.deepEqual(newKeystore.crypto, previousKeystore.crypto);
      assert.deepEqual(
        newKeystore.dataEncryptionKey,
        previousKeystore.dataEncryptionKey,
      );
      assert.deepEqual(newKeystore.hmacKey, previousKeystore.hmacKey);

      assert.notDeepEqual(newKeystore.hmac, previousKeystore.hmac);
      assert.notDeepEqual(newKeystore.secrets, previousKeystore.secrets);

      assert.ok(
        "my-secret" in newKeystore.secrets,
        "The secret should be present",
      );
      assert.ok(
        "my-secret-2" in newKeystore.secrets,
        "The secret should be present",
      );

      // Overwritting a secret
      previousKeystore = newKeystore;
      newKeystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: previousKeystore,
        key: "my-secret-2",
        value: "my-secret-value-2",
      });

      assert.deepEqual(newKeystore.crypto, previousKeystore.crypto);
      assert.deepEqual(
        newKeystore.dataEncryptionKey,
        previousKeystore.dataEncryptionKey,
      );
      assert.deepEqual(newKeystore.hmacKey, previousKeystore.hmacKey);

      assert.notDeepEqual(newKeystore.hmac, previousKeystore.hmac);
      assert.notDeepEqual(newKeystore.secrets, previousKeystore.secrets);

      assert.ok(
        "my-secret" in newKeystore.secrets,
        "The secret should be present",
      );
      assert.ok(
        "my-secret-2" in newKeystore.secrets,
        "The secret should be present",
      );

      assert.notDeepEqual(
        newKeystore.secrets["my-secret-2"],
        previousKeystore.secrets["my-secret-2"],
      );
    });

    it("Should validate the hmac", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      assertThrows(
        () =>
          addSecretToKeystore({
            masterKey,
            encryptedKeystore: { ...emptyKeystore, hmac: "invalid-hmac" },
            key: "my-secret",
            value: "my-secret-value",
          }),
        (e) => e instanceof InvalidHmacError,
      );

      assertThrows(
        () =>
          addSecretToKeystore({
            masterKey,
            encryptedKeystore: {
              ...emptyKeystore,
              hmac: "0000000000" + emptyKeystore.hmac.slice(10),
            },
            key: "my-secret",
            value: "my-secret-value",
          }),
        (e) => e instanceof InvalidHmacError,
      );
    });
  });

  describe("Removing secrets to keystore", () => {
    it("Should throw if the secret is not present", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      assertThrows(
        () =>
          removeSecretFromKeystore({
            masterKey,
            encryptedKeystore: emptyKeystore,
            keyToRemove: "my-secret",
          }),
        (e) => e instanceof SecretNotFoundError,
      );
    });

    it("Should remove secrets from a keystore, modifying only that secret and the hmac", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      let keystore = emptyKeystore;
      keystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: keystore,
        key: "my-secret",
        value: "my-secret-value",
      });

      keystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: keystore,
        key: "my-secret-2",
        value: "my-secret-value-2",
      });

      let previousKeystore = keystore;

      keystore = removeSecretFromKeystore({
        masterKey,
        encryptedKeystore: keystore,
        keyToRemove: "my-secret",
      });

      assert.deepEqual(keystore.crypto, previousKeystore.crypto);
      assert.deepEqual(
        keystore.dataEncryptionKey,
        previousKeystore.dataEncryptionKey,
      );
      assert.deepEqual(keystore.hmacKey, previousKeystore.hmacKey);
      assert.deepEqual(
        keystore.secrets["my-secret-2"],
        previousKeystore.secrets["my-secret-2"],
      );

      assert.notDeepEqual(keystore.hmac, previousKeystore.hmac);
      assert.notDeepEqual(keystore.secrets, previousKeystore.secrets);

      assert.ok(
        !("my-secret" in keystore.secrets),
        "The secret shouldn't be present after removing it",
      );

      previousKeystore = keystore;

      keystore = removeSecretFromKeystore({
        masterKey,
        encryptedKeystore: keystore,
        keyToRemove: "my-secret-2",
      });

      assert.deepEqual(keystore.crypto, previousKeystore.crypto);
      assert.deepEqual(
        keystore.dataEncryptionKey,
        previousKeystore.dataEncryptionKey,
      );
      assert.deepEqual(keystore.hmacKey, previousKeystore.hmacKey);
      assert.deepEqual(keystore.secrets, {});

      assert.notDeepEqual(keystore.hmac, previousKeystore.hmac);
    });

    it("Should validate the hmac", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      const keystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: emptyKeystore,
        key: "my-secret",
        value: "my-secret-value",
      });

      assertThrows(
        () =>
          removeSecretFromKeystore({
            masterKey,
            encryptedKeystore: {
              ...keystore,
              hmac: "0000000000" + keystore.hmac.slice(10),
            },
            keyToRemove: "my-secret",
          }),
        (e) => e instanceof InvalidHmacError,
      );
    });
  });

  describe("Checking if a key exists", () => {
    it("should return true if the key exists and false if it does not", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      let keystore = emptyKeystore;
      keystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: keystore,
        key: "my-secret",
        value: "my-secret-value",
      });

      assert.equal(
        doesKeyExist({
          masterKey,
          encryptedKeystore: keystore,
          key: "my-secret",
        }),
        true,
      );

      assert.equal(
        doesKeyExist({
          masterKey,
          encryptedKeystore: keystore,
          key: "my-non-existing-secret",
        }),
        false,
      );
    });
  });

  describe("Decrypting a secret from keystore", () => {
    it("Should throw if the secret is not present", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      assertThrows(
        () =>
          decryptSecret({
            masterKey,
            encryptedKeystore: emptyKeystore,
            key: "my-secret",
          }),
        (e) => e instanceof SecretNotFoundError,
      );
    });

    it("Should allow a round trip of adding and decrypting a secret", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      const value = "my-secret-value";

      const keystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: emptyKeystore,
        key: "my-secret",
        value,
      });

      const secret = decryptSecret({
        masterKey,
        encryptedKeystore: keystore,
        key: "my-secret",
      });

      assert.equal(secret, value);
    });

    it("Should throw if the password is incorrect", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      const value = "my-secret-value";

      const keystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: emptyKeystore,
        key: "my-secret",
        value,
      });

      const incorrectMasterKey = deriveMasterKeyFromKeystore({
        password: "incorrect-password",
        encryptedKeystore: keystore,
      });

      assertThrows(
        () =>
          decryptSecret({
            masterKey: incorrectMasterKey,
            encryptedKeystore: keystore,
            key: "my-secret",
          }),
        (e) => e instanceof HmacKeyDecryptionError,
      );
    });

    it("Should validate the hmac", () => {
      it("Should validate the hmac", () => {
        const { emptyKeystore, masterKey } = testEmptyKeystore;

        const keystore = addSecretToKeystore({
          masterKey,
          encryptedKeystore: emptyKeystore,
          key: "my-secret",
          value: "my-secret-value",
        });

        assertThrows(
          () =>
            decryptSecret({
              masterKey,
              encryptedKeystore: {
                ...keystore,
                hmac: "0000000000" + keystore.hmac.slice(10),
              },
              key: "my-secret",
            }),
          (e) => e instanceof InvalidHmacError,
        );
      });
    });
  });

  describe("hmac validation", () => {
    it("Should throw if the hmac is invalid", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      assertThrows(
        () =>
          validateHmac({
            masterKey,
            encryptedKeystore: {
              ...emptyKeystore,
              hmac: "0000000000" + emptyKeystore.hmac.slice(10),
            },
          }),
        (e) => e instanceof InvalidHmacError,
      );
    });

    it("Should throw if the hmac key is corrupted", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      assertThrows(
        () =>
          validateHmac({
            masterKey,
            encryptedKeystore: {
              ...emptyKeystore,
              hmacKey: {
                iv: emptyKeystore.hmacKey.iv,
                cypherText: "0000000000" + emptyKeystore.hmac.slice(10),
              },
            },
          }),
        (e) => e instanceof HmacKeyDecryptionError,
      );
    });

    it("Should throw if the data encryption key is corrupted", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      assertThrows(
        () =>
          validateHmac({
            masterKey,
            encryptedKeystore: {
              ...emptyKeystore,
              dataEncryptionKey: {
                iv: emptyKeystore.dataEncryptionKey.iv,
                cypherText: "0000000000" + emptyKeystore.hmac.slice(10),
              },
            },
          }),
        (e) => e instanceof InvalidHmacError,
      );
    });

    it("Should throw if the master key salt is corrupted", () => {
      const { emptyKeystore, password } = testEmptyKeystore;

      const corruptedKeystore: EncryptedKeystore = {
        ...emptyKeystore,
        crypto: {
          ...emptyKeystore.crypto,
          masterKeyDerivation: {
            ...emptyKeystore.crypto.masterKeyDerivation,
            salt:
              "0000000000" +
              emptyKeystore.crypto.masterKeyDerivation.salt.slice(10),
          },
        },
      };

      const corruptedMasterKey = deriveMasterKeyFromKeystore({
        password,
        encryptedKeystore: corruptedKeystore,
      });

      assertThrows(
        () =>
          validateHmac({
            masterKey: corruptedMasterKey,
            encryptedKeystore: corruptedKeystore,
          }),
        (e) => e instanceof HmacKeyDecryptionError,
      );
    });

    it("Should throw if the master key derivation params are corrupted", () => {
      // While we are changing the scrypt params in this test, we are still able
      // to derive the master key from the keystore, because we don't use the
      // params in the keystore file, but only validate them.
      const { emptyKeystore, password } = testEmptyKeystore;

      const corruptedKeystore: EncryptedKeystore = {
        ...emptyKeystore,
        crypto: {
          ...emptyKeystore.crypto,
          masterKeyDerivation: {
            ...emptyKeystore.crypto.masterKeyDerivation,
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Intentional cast for testing purposes
            paramN: 123 as any,
          },
        },
      };

      const corruptedMasterKey = deriveMasterKeyFromKeystore({
        password,
        encryptedKeystore: corruptedKeystore,
      });

      assertThrows(
        () =>
          validateHmac({
            masterKey: corruptedMasterKey,
            encryptedKeystore: corruptedKeystore,
          }),
        (e) => e instanceof InvalidHmacError,
      );
    });

    it("Should throw if the other params are corrupted", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      const corruptedKeystore: EncryptedKeystore = {
        ...emptyKeystore,
        crypto: {
          ...emptyKeystore.crypto,
          encryption: {
            ...emptyKeystore.crypto.encryption,
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Intentional cast for testing purposes
            keyLength: 123 as any,
          },
        },
      };

      assertThrows(
        () =>
          validateHmac({
            masterKey,
            encryptedKeystore: corruptedKeystore,
          }),
        (e) => e instanceof InvalidHmacError,
      );
    });

    it("Should throw if a secret is corrupted", () => {
      const { emptyKeystore, masterKey } = testEmptyKeystore;

      const keystore = addSecretToKeystore({
        masterKey,
        encryptedKeystore: emptyKeystore,
        key: "my-secret",
        value: "my-secret-value",
      });

      const corruptedKeystore: EncryptedKeystore = {
        ...keystore,
        secrets: {
          ...keystore.secrets,
          "my-secret": {
            ...keystore.secrets["my-secret"],
            cypherText:
              "0000000000" + keystore.secrets["my-secret"].cypherText.slice(10),
          },
        },
      };

      assertThrows(
        () =>
          validateHmac({
            masterKey,
            encryptedKeystore: corruptedKeystore,
          }),
        (e) => e instanceof InvalidHmacError,
      );
    });
  });
});

describe("password normalization", () => {
  const password1 = "perché"; // "e" + "\u0301" (combining acute accent)
  const password2 = "perché"; // Directly using "è"

  before(() => {
    // Confirm that the passwords are different
    assert.notEqual(password1, password2);
  });

  it("should normalize the passwords correctly'", () => {
    // create a master key using the password1
    const { masterKey, salt } = createMasterKey({
      password: password1,
    });

    // create an encrypted file using the masterKey created above with password1
    const encryptedFile = createEmptyEncryptedKeystore({
      masterKey,
      salt,
    });

    // derive the masterKey from the encrypted file created above using the password2
    const materKey2 = deriveMasterKeyFromKeystore({
      encryptedKeystore: encryptedFile,
      password: password2,
    });

    // the derived masterKey should be the same as the one created with password1 because of the password normalization
    assert.deepEqual(masterKey, materKey2);
  });
});
