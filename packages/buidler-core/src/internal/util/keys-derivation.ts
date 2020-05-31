import { mnemonicToSeedSync } from "ethereum-cryptography/bip39";
import { HDKey } from "ethereum-cryptography/hdkey";

export function deriveKeyFromMnemonicAndPath(
  mnemonic: string,
  hdPath: string
): Buffer | undefined {
  const seed = mnemonicToSeedSync(mnemonic);

  const masterKey = HDKey.fromMasterSeed(seed);
  const derived = masterKey.derive(hdPath);

  return derived.privateKey === null ? undefined : derived.privateKey;
}
