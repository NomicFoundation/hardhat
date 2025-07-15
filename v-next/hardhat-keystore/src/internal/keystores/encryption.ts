import { siv } from "@noble/ciphers/aes";
import { hmac } from "@noble/hashes/hmac";
import { scrypt } from "@noble/hashes/scrypt";
import { sha256 } from "@noble/hashes/sha2";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils";

/// ////////////////////////////////////////////////////////////////////////////
// Constants
/// ////////////////////////////////////////////////////////////////////////////

export const KEYSTORE_VERSION = "hardhat-v3-keystore-1" as const;
export const PASSWORD_NORMALIZATION_FORM = "NFKC" as const;

// Scrypt recommendation based on OWASP and noble-hashes implementation:
// See: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
// And: https://github.com/paulmillr/noble-hashes/blob/5cadc86d2cae1184607989817854813ecc7033a9/README.md
// Parameters based on OWASP's cheat sheet: N=2^17 (128 MiB), r=8 (1024 bytes), p=1

export const KEY_DERIVARION_ALGORITHM = "scrypt" as const;
export const KEY_DERIVATION_PARAM_N = 131_072 as const;
export const KEY_DERIVATION_PARAM_R = 8 as const;
export const KEY_DERIVATION_PARAM_P = 1 as const;
export const KEY_DERIVATION_SALT_LENGTH_BYTES = 32 as const;
export const MASTER_KEY_LENGTH_BITS = 256 as const;

// HMAC-SHA-256
export const HMAC_ALGORITHM = "HMAC-SHA-256" as const;
export const HMAC_KEY_LENGTH_BITS = 256 as const;

// AES-GCM-SIV used for tolerance of IV collisions
export const DATA_ENCRYPTION_ALGORITHM = "AES-GCM-SIV" as const;
export const DATA_ENCRYPTION_KEY_LENGTH_BITS = 256 as const;
export const DATA_ENCRYPTION_IV_LENGTH_BYTES = 12 as const;

/// ////////////////////////////////////////////////////////////////////////////
// Types
/// ////////////////////////////////////////////////////////////////////////////

/**
 * This interface represents an encrypted keystore.
 *
 * Every data buffer here is represented as a hex string (withoyt "0x" prefix).
 */
export interface EncryptedKeystore {
  version: typeof KEYSTORE_VERSION;
  crypto: {
    masterKeyDerivation: {
      algorithm: typeof KEY_DERIVARION_ALGORITHM;
      paramN: typeof KEY_DERIVATION_PARAM_N;
      paramP: typeof KEY_DERIVATION_PARAM_P;
      paramR: typeof KEY_DERIVATION_PARAM_R;
      unicodeNormalizationForm: typeof PASSWORD_NORMALIZATION_FORM;
      keyLength: typeof MASTER_KEY_LENGTH_BITS;
      salt: string;
    };
    encryption: {
      algorithm: typeof DATA_ENCRYPTION_ALGORITHM;
      keyLength: typeof DATA_ENCRYPTION_KEY_LENGTH_BITS;
    };
    hmac: {
      algorithm: typeof HMAC_ALGORITHM;
      keyLength: typeof HMAC_KEY_LENGTH_BITS;
    };
  };
  dataEncryptionKey: SerializedEncryptedData;
  hmacKey: SerializedEncryptedData;
  hmac: string;
  secrets: Record<string, SerializedEncryptedData>;
}

/**
 * This interface represents an encrypted data buffer.
 */
export interface EncryptedData {
  /**
   * The initialization vector used to encrypt the data.
   */
  iv: Uint8Array;

  /**
   * The encrypted data buffer.
   */
  cypherText: Uint8Array;
}

/**
 * The hex-encoding serialization of EncryptedData.
 */
export interface SerializedEncryptedData {
  iv: string; // hex encoded
  cypherText: string; // hex encoded
}

// /////////////////////////////////////////////////////////////////////////////
// Serialization utilities
// /////////////////////////////////////////////////////////////////////////////

/**
 * Serializes an EncryptedData object into a SerializedEncryptedData object.
 */
export function serializeEncryptedData(
  data: EncryptedData,
): SerializedEncryptedData {
  return {
    iv: bytesToHex(data.iv),
    cypherText: bytesToHex(data.cypherText),
  };
}

/**
 * Deserializes a SerializedEncryptedData object into an EncryptedData object.
 */
export function deserializeEncryptedData(
  serializedData: SerializedEncryptedData,
): EncryptedData {
  return {
    iv: hexToBytes(serializedData.iv),
    cypherText: hexToBytes(serializedData.cypherText),
  };
}

/**
 * Uses JSON.stringify with a custom replacer to make sure that a
 * JsonWithNumbersAndStrings is serialized deterministically.
 *
 * This function only supports objects whose values are numbers, strings, or
 * objects with the same constraints.
 */
export function deterministicJsonStringify<ObjectT extends object>(
  obj: ObjectT,
): string {
  return JSON.stringify(obj, function stableReplacer(key, value) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "undefined"
    ) {
      return value;
    }

    if (typeof value !== "object") {
      // eslint-disable-next-line no-restricted-syntax -- We don't throw HardhatErrors here
      throw new UnsupportedTypeInDeterministicJsonError(typeof value);
    }

    if (value === null) {
      // eslint-disable-next-line no-restricted-syntax -- We don't throw HardhatErrors here
      throw new UnsupportedTypeInDeterministicJsonError("null");
    }

    if (Array.isArray(value)) {
      // eslint-disable-next-line no-restricted-syntax -- We don't throw HardhatErrors here
      throw new UnsupportedTypeInDeterministicJsonError("array");
    }

    // Sort object keys in ascending order, then build a new object.
    const sortedKeys = Object.keys(value).sort();
    const newObj: any = {};
    for (const k of sortedKeys) {
      newObj[k] = value[k];
    }

    return newObj;
  });
}

// /////////////////////////////////////////////////////////////////////////////
// Custom error types: We don't use HardhatError here, because we want this
// module to be as self contained as possible. The only dependencies are
// @noble/ciphers and @noble/hashes.
// /////////////////////////////////////////////////////////////////////////////

abstract class CustomError extends Error {
  public override stack!: string;

  constructor(message: string, cause?: Error) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnsupportedTypeInDeterministicJsonError extends CustomError {
  public readonly type: string;

  constructor(type: string) {
    super(
      `Unsupported type in deterministicJson: ${
        type === "object" ? "array or null" : type
      }`,
    );
    this.type = type;
  }
}

export class DecryptionError extends CustomError {
  constructor(cause?: Error) {
    super(
      "Decryption failed: make sure you are using the right password/key and that your encrypted data isn't corrupted",
      cause,
    );
  }
}

export class SecretNotFoundError extends CustomError {
  public readonly key: string;

  constructor(key: string) {
    super(`Secret with key "${key}" not found in the keystore`);
    this.key = key;
  }
}

export class HmacKeyDecryptionError extends CustomError {
  constructor(cause?: Error) {
    super(
      "Invalid hmac key: make sure you are using the right password/key and that your encrypted data isn't corrupted",
      cause,
    );
  }
}

export class InvalidHmacError extends CustomError {
  constructor() {
    super(`Invalid hmac in keystore`);
  }
}

/// ////////////////////////////////////////////////////////////////////////////
// Generic crypto utils
/// ////////////////////////////////////////////////////////////////////////////

/**
 * Encrypts the utf-8 encoded value using the master key, and a new random iv.
 *
 * @param encryptionKey The encryption key to use.
 * @param value The value to encrypt, which will be utf-8 encoded.
 * @returns An object containing the iv and cypherText.
 *
 * @remarks
 * The random IV is only 12 bytes, so we are assuming that no more than 2^20 encryptions are done with the same key
 * as the probability of IV collision reaches 2^-57 at that point.
 */
export function encryptUtf8String({
  encryptionKey,
  value,
}: {
  encryptionKey: Uint8Array;
  value: string;
}): EncryptedData {
  const iv = randomBytes(DATA_ENCRYPTION_IV_LENGTH_BYTES);
  const cypherText = siv(encryptionKey, iv).encrypt(
    new TextEncoder().encode(value),
  );

  return { iv, cypherText };
}

/**
 * Decrypts an utf-8 string using the master key and the iv.
 *
 * @param encryptionKey The encryption key to use.
 * @param iv The iv to use.
 * @param cypherText The cypherText to decrypt, which will then be utf-8
 * decoded.
 * @returns The decrypted value.
 */
export function decryptUtf8String({
  encryptionKey,
  data,
}: {
  encryptionKey: Uint8Array;
  data: EncryptedData;
}): string {
  let decryptedBuffer: Uint8Array;
  try {
    decryptedBuffer = siv(encryptionKey, data.iv).decrypt(data.cypherText);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    // eslint-disable-next-line no-restricted-syntax -- We don't throw HardhatErrors here
    throw new DecryptionError(error);
  }

  return new TextDecoder().decode(decryptedBuffer);
}

/// /////////////////////////////////////////////////////////////////////////////
// Keystore primitives
/// /////////////////////////////////////////////////////////////////////////////

/**
 * Creates a new master key from the password. This function can be called
 * multiple times to derive new keys from the same password.
 *
 * @param password The user's password.
 * @returns An object containing the salt and master key.
 */
export function createMasterKey({ password }: { password: string }): {
  salt: Uint8Array;
  masterKey: Uint8Array;
} {
  const salt = randomBytes(KEY_DERIVATION_SALT_LENGTH_BYTES);

  const masterKey = deriveMasterKey({ password, salt });

  return { salt, masterKey };
}

/**
 * Creates an empty EncryptedKeystore.
 *
 * To add and remove secrets to it see `addSecretToKeystore` and
 * `removeSecretFromKeystore`.
 *
 * @param masterKey The master key to use.
 * @param salt The salt of the master key.
 * @returns The empty EncryptedKeystore.
 */
export function createEmptyEncryptedKeystore({
  masterKey,
  salt,
}: {
  masterKey: Uint8Array;
  salt: Uint8Array;
}): EncryptedKeystore {
  const dataEncryptionKey = randomBytes(DATA_ENCRYPTION_KEY_LENGTH_BITS / 8);
  const hmacKey = randomBytes(HMAC_KEY_LENGTH_BITS / 8);

  const hmacPreImageObject: Omit<EncryptedKeystore, "hmac"> = {
    version: KEYSTORE_VERSION,
    crypto: {
      masterKeyDerivation: {
        algorithm: KEY_DERIVARION_ALGORITHM,
        paramN: KEY_DERIVATION_PARAM_N,
        paramP: KEY_DERIVATION_PARAM_P,
        paramR: KEY_DERIVATION_PARAM_R,
        unicodeNormalizationForm: PASSWORD_NORMALIZATION_FORM,
        keyLength: MASTER_KEY_LENGTH_BITS,
        salt: bytesToHex(salt),
      },
      encryption: {
        algorithm: DATA_ENCRYPTION_ALGORITHM,
        keyLength: DATA_ENCRYPTION_KEY_LENGTH_BITS,
      },
      hmac: {
        algorithm: HMAC_ALGORITHM,
        keyLength: HMAC_KEY_LENGTH_BITS,
      },
    },
    hmacKey: serializeEncryptedData(
      encryptUtf8String({
        encryptionKey: masterKey,
        value: bytesToHex(hmacKey),
      }),
    ),
    dataEncryptionKey: serializeEncryptedData(
      encryptUtf8String({
        encryptionKey: masterKey,
        value: bytesToHex(dataEncryptionKey),
      }),
    ),
    secrets: {},
  };

  return {
    ...hmacPreImageObject,
    hmac: bytesToHex(
      generateEncryptedKeystoreHmac({
        masterKey,
        encryptedKeystore: hmacPreImageObject,
      }),
    ),
  };
}

/**
 * Derives the master key from an existing keystore, using the user's password.
 *
 * @param password The user's password.
 * @param encryptedKeystore The keystore, where the master key's salt is stored.
 * @returns The derived master key. This value is safe to keep in memory.
 */
export function deriveMasterKeyFromKeystore({
  password,
  encryptedKeystore,
}: {
  password: string;
  encryptedKeystore: EncryptedKeystore;
}): Uint8Array {
  const salt = hexToBytes(encryptedKeystore.crypto.masterKeyDerivation.salt);

  return deriveMasterKey({ password, salt });
}

/**
 * Checks if the specified key exists in the provided encrypted keystore.
 *
 * @param masterKey The master key to use.
 * @param encryptedKeystore - The encrypted keystore object containing the secrets.
 * @param key - The name of the secret to check for existence.
 * @returns True if the key is present in the keystore, otherwise false.
 *
 * @remarks
 * This function first calls `validateHmac` to verify the cryptographic integrity of
 * the keystore before checking for the existence of the specified key.
 */
export function doesKeyExist({
  masterKey,
  encryptedKeystore,
  key,
}: {
  masterKey: Uint8Array;
  encryptedKeystore: EncryptedKeystore;
  key: string;
}): boolean {
  validateHmac({ masterKey, encryptedKeystore });
  return Object.keys(encryptedKeystore.secrets).includes(key);
}

/**
 * Adds a secret to an existing keystore.
 *
 * @param masterKey The master key to use.
 * @param encryptedKeystore The keystore to add the secret to.
 * @param key The key of the secret to add.
 * @param value The value of the secret to add.
 * @returns A new EncryptedKeystore, where the secret has been added.
 */
export function addSecretToKeystore({
  masterKey,
  encryptedKeystore,
  key,
  value,
}: {
  masterKey: Uint8Array;
  encryptedKeystore: EncryptedKeystore;
  key: string;
  value: string;
}): EncryptedKeystore {
  validateHmac({ masterKey, encryptedKeystore });

  const dataEncryptionKey = hexToBytes(
    decryptUtf8String({
      encryptionKey: masterKey,
      data: deserializeEncryptedData(encryptedKeystore.dataEncryptionKey),
    }),
  );

  const secrets = {
    ...encryptedKeystore.secrets,
    [key]: serializeEncryptedData(
      encryptUtf8String({ encryptionKey: dataEncryptionKey, value }),
    ),
  };

  const updatedEncryptedKeystoreWithoutHmac = {
    ...encryptedKeystore,
    secrets,
    hmac: undefined,
  };

  const updatedHmac = generateEncryptedKeystoreHmac({
    masterKey,
    encryptedKeystore: updatedEncryptedKeystoreWithoutHmac,
  });

  return {
    ...updatedEncryptedKeystoreWithoutHmac,
    hmac: bytesToHex(updatedHmac),
  };
}

/**
 * Removes a secret from an existing keystore.
 *
 * @param masterKey The master key to use.
 * @param encryptedKeystore The keystore to remove the secret from.
 * @param keyToRemove The key of the secret to remove.
 * @returns A new EncryptedKeystore, where the secret has been removed.
 */
export function removeSecretFromKeystore({
  masterKey,
  encryptedKeystore,
  keyToRemove,
}: {
  masterKey: Uint8Array;
  encryptedKeystore: EncryptedKeystore;
  keyToRemove: string;
}): EncryptedKeystore {
  validateHmac({ masterKey, encryptedKeystore });

  if (!(keyToRemove in encryptedKeystore.secrets)) {
    // eslint-disable-next-line no-restricted-syntax -- We don't throw HardhatErrors here
    throw new SecretNotFoundError(keyToRemove);
  }

  const secrets = {
    ...encryptedKeystore.secrets,
  };

  delete secrets[keyToRemove];

  const updatedEncryptedKeystoreWithoutHmac = {
    ...encryptedKeystore,
    secrets,
    hmac: undefined,
  };

  const updatedHmac = generateEncryptedKeystoreHmac({
    masterKey,
    encryptedKeystore: updatedEncryptedKeystoreWithoutHmac,
  });

  return {
    ...updatedEncryptedKeystoreWithoutHmac,
    hmac: bytesToHex(updatedHmac),
  };
}

/**
 * Decrypts an individual secret from the EncryptedKeystoreValuesEnvelope.
 *
 * @param masterKey The master key to use.
 * @param valuesEnvelope The EncryptedKeystoreValuesEnvelope, where the secret
 * is stored.
 * @param key The key of the secret to decrypt.
 * @returns The decrypted secret. Do not keep this value in memory.
 */
export function decryptSecret({
  masterKey,
  encryptedKeystore,
  key,
}: {
  masterKey: Uint8Array;
  encryptedKeystore: EncryptedKeystore;
  key: string;
}): string {
  validateHmac({ masterKey, encryptedKeystore });

  if (!(key in encryptedKeystore.secrets)) {
    // eslint-disable-next-line no-restricted-syntax -- We don't throw HardhatErrors here
    throw new SecretNotFoundError(key);
  }

  const dataEncryptionKey = hexToBytes(
    decryptUtf8String({
      encryptionKey: masterKey,
      data: deserializeEncryptedData(encryptedKeystore.dataEncryptionKey),
    }),
  );

  const encryptedData = encryptedKeystore.secrets[key];

  return decryptUtf8String({
    encryptionKey: dataEncryptionKey,
    data: deserializeEncryptedData(encryptedData),
  });
}

// /////////////////////////////////////////////////////////////////////////////
// Internal keystore primitives: Some are exported for testing purposes
// /////////////////////////////////////////////////////////////////////////////

/**
 * Derives a master key based on the user's password and an existing salt
 * (normally obtained from an EncryptedKeystore).
 *
 * @param password The user's password.
 * @param salt The existing salt.
 * @returns The derived master key.
 */
function deriveMasterKey({
  password,
  salt,
}: {
  password: string;
  salt: Uint8Array;
}): Uint8Array {
  password = password.normalize(PASSWORD_NORMALIZATION_FORM);

  const masterKey = scrypt(password, salt, {
    N: KEY_DERIVATION_PARAM_N,
    r: KEY_DERIVATION_PARAM_R,
    p: KEY_DERIVATION_PARAM_P,
    dkLen: MASTER_KEY_LENGTH_BITS / 8,
  });

  return masterKey;
}

/**
 * Generates the hmac of an encrypted keystore.
 *
 * @param masterKey The keystore's master key to use.
 * @param encryptedKeystore The keystore to generate the hmac for, without the
 * hmac field.
 * @returns The hmac.
 */
export function generateEncryptedKeystoreHmac({
  masterKey,
  encryptedKeystore,
}: {
  masterKey: Uint8Array;
  encryptedKeystore: Omit<EncryptedKeystore, "hmac">;
}): Uint8Array {
  let hmacKey: Uint8Array;
  try {
    const hmacKeyString = decryptUtf8String({
      encryptionKey: masterKey,
      data: deserializeEncryptedData(encryptedKeystore.hmacKey),
    });

    hmacKey = hexToBytes(hmacKeyString);
  } catch (error) {
    if (!(error instanceof DecryptionError)) {
      throw error;
    }

    // eslint-disable-next-line no-restricted-syntax -- We don't throw HardhatErrors here
    throw new HmacKeyDecryptionError(error);
  }

  const json = deterministicJsonStringify({
    ...encryptedKeystore,
    hmac: undefined,
  });

  return hmac(sha256, hmacKey, new TextEncoder().encode(json));
}

/**
 * Throws an error if the hmac present in the encrypted keystore doesn't match
 * a newly generated one.
 *
 * @param masterKey The keystore's master key to use.
 * @param encryptedKeystore The keystore whose hmac should be validated.
 */
export function validateHmac({
  masterKey,
  encryptedKeystore,
}: {
  masterKey: Uint8Array;
  encryptedKeystore: EncryptedKeystore;
}): void {
  const generatedHmac = generateEncryptedKeystoreHmac({
    masterKey,
    encryptedKeystore,
  });

  const generatedHmacHex = bytesToHex(generatedHmac);

  if (generatedHmacHex !== encryptedKeystore.hmac) {
    // eslint-disable-next-line no-restricted-syntax -- We don't throw HardhatErrors here
    throw new InvalidHmacError();
  }
}
