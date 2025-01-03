import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { bytesToHexString } from "@ignored/hardhat-vnext-utils/bytes";
import { mnemonicToSeedSync } from "ethereum-cryptography/bip39";
import { HDKey } from "ethereum-cryptography/hdkey";

const HD_PATH_REGEX = /^m(:?\/\d+'?)+\/?$/;

export function derivePrivateKeys(
  mnemonic: string,
  hdpath: string,
  initialIndex: number,
  count: number,
  passphrase: string,
): string[] {
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
    const privateKey = deriveKeyFromMnemonicAndPath(
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

function deriveKeyFromMnemonicAndPath(
  mnemonic: string,
  hdPath: string,
  passphrase: string,
): string | undefined {
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
