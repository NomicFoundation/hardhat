import { fromSeed } from "bip32";
import { mnemonicToSeedSync } from "bip39";

export function deriveKeyFromMnemonicAndPath(
  mnemonic: string,
  hdPath: string
): Buffer | undefined {
  const seed = mnemonicToSeedSync(mnemonic);
  const masterKey = fromSeed(seed);
  const derived = masterKey.derivePath(hdPath);

  return derived.privateKey;
}
