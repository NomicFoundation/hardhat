import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/bytes";

const HD_PATH_REGEX = /^m(:?\/\d+'?)+\/?$/;

export async function derivePrivateKeys(
  mnemonic: string,
  hdpath: string,
  initialIndex: number,
  count: number,
  passphrase: string,
): Promise<string[]> {
  if (!HD_PATH_REGEX.test(hdpath)) {
    throw new HardhatError(HardhatError.ERRORS.NETWORK.INVALID_HD_PATH, {
      path: hdpath,
    });
  }

  if (!hdpath.endsWith("/")) {
    hdpath += "/";
  }

  const privateKeys: string[] = [];

  for (let i = initialIndex; i < initialIndex + count; i++) {
    const privateKey = await deriveKeyFromMnemonicAndPath(
      mnemonic,
      hdpath + i.toString(),
      passphrase,
    );

    if (privateKey === undefined) {
      throw new HardhatError(HardhatError.ERRORS.NETWORK.CANT_DERIVE_KEY, {
        mnemonic,
        path: hdpath,
      });
    }

    privateKeys.push(privateKey);
  }

  return privateKeys;
}

async function deriveKeyFromMnemonicAndPath(
  mnemonic: string,
  hdPath: string,
  passphrase: string,
): Promise<string | undefined> {
  const { mnemonicToSeedSync } = await import("ethereum-cryptography/bip39");
  const { HDKey } = await import("ethereum-cryptography/hdkey");

  // NOTE: If mnemonic has space or newline at the beginning or end, it will be trimmed.
  // This is because mnemonic containing them may generate different private keys.
  const trimmedMnemonic = mnemonic.trim();

  const seed = mnemonicToSeedSync(trimmedMnemonic, passphrase);

  const masterKey = HDKey.fromMasterSeed(seed);
  const derived = masterKey.derive(hdPath);

  return derived.privateKey === null
    ? undefined
    : bytesToHexString(derived.privateKey);
}
