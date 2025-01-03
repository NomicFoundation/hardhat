import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { mnemonicToSeedSync } from "ethereum-cryptography/bip39";
import { HDKey } from "ethereum-cryptography/hdkey";

const HD_PATH_REGEX = /^m(:?\/\d+'?)+\/?$/;

export const DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS = {
  initialIndex: 0,
  count: 20,
  path: "m/44'/60'/0'/0",
  passphrase: "",
};

export function derivePrivateKeys(
  mnemonic: string,
  hdpath: string,
  initialIndex: number,
  count: number,
  passphrase: string,
): Buffer[] {
  if (hdpath.match(HD_PATH_REGEX) === null) {
    throw new HardhatError(HardhatError.ERRORS.NETWORK.INVALID_HD_PATH, {
      path: hdpath,
    });
  }

  if (!hdpath.endsWith("/")) {
    hdpath += "/";
  }

  const privateKeys: Buffer[] = [];

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
): Buffer | undefined {
  // NOTE: If mnemonic has space or newline at the beginning or end, it will be trimmed.
  // This is because mnemonic containing them may generate different private keys.
  const trimmedMnemonic = mnemonic.trim();

  const seed = mnemonicToSeedSync(trimmedMnemonic, passphrase);

  const masterKey = HDKey.fromMasterSeed(seed);
  const derived = masterKey.derive(hdPath);

  return derived.privateKey === null
    ? undefined
    : Buffer.from(derived.privateKey);
}
