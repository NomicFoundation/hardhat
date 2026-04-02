import type * as Bip39T from "ethereum-cryptography/bip39";
import type { HDKey as HDKeyT } from "ethereum-cryptography/hdkey";
import type {
  EdrNetworkHDAccountsConfig,
  HttpNetworkHDAccountsConfig,
} from "hardhat/types/config";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/bytes";

// ethereum-cryptography/bip39 is known to be slow to load, so we lazy load it
let mnemonicToSeedSync: typeof Bip39T.mnemonicToSeedSync | undefined;

// ethereum-cryptography/hdkey is known to be slow to load, so we lazy load it
let HDKey: typeof HDKeyT | undefined;

const HD_PATH_REGEX = /^m(:?\/\d+'?)+\/?$/;

export async function derivePrivateKeys(
  accounts: EdrNetworkHDAccountsConfig | HttpNetworkHDAccountsConfig,
): Promise<string[]> {
  const mnemonic = await accounts.mnemonic.get();
  const passphrase = await accounts.passphrase.get();

  return derivePrivateKeysImpl(
    mnemonic,
    accounts.path,
    accounts.initialIndex,
    accounts.count,
    passphrase,
  );
}

async function derivePrivateKeysImpl(
  mnemonic: string,
  hdpath: string,
  initialIndex: number,
  count: number,
  passphrase: string,
): Promise<string[]> {
  if (!HD_PATH_REGEX.test(hdpath)) {
    throw new HardhatError(HardhatError.ERRORS.CORE.NETWORK.INVALID_HD_PATH, {
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
      throw new HardhatError(HardhatError.ERRORS.CORE.NETWORK.CANT_DERIVE_KEY, {
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
  // NOTE: If mnemonic has space or newline at the beginning or end, it will be trimmed.
  // This is because mnemonic containing them may generate different private keys.
  const trimmedMnemonic = mnemonic.trim();

  if (mnemonicToSeedSync === undefined) {
    const { mnemonicToSeedSync: importedMnemonicToSeedSync } = await import(
      "ethereum-cryptography/bip39"
    );

    mnemonicToSeedSync = importedMnemonicToSeedSync;
  }

  if (HDKey === undefined) {
    const { HDKey: ImportedHDKey } = await import(
      "ethereum-cryptography/hdkey"
    );

    HDKey = ImportedHDKey;
  }

  const seed = mnemonicToSeedSync(trimmedMnemonic, passphrase);

  const masterKey = HDKey.fromMasterSeed(seed);
  const derived = masterKey.derive(hdPath);

  return derived.privateKey === null
    ? undefined
    : bytesToHexString(derived.privateKey);
}
