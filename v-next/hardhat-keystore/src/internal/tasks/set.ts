import type { KeystoreLoader } from "../types.js";
import type { UserInteractions } from "../ui/user-interactions.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { setupDirectInterruptionsAndKeystoreLoader } from "../utils/setup-direct-interruptions-and-keystore-loader.js";
import { validateKey } from "../utils/validate-key.js";

interface TaskGetArguments {
  key: string;
  force: boolean;
}

const taskSet: NewTaskActionFunction<TaskGetArguments> = async (
  setArgs,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  const { keystoreLoader, interruptions } =
    await setupDirectInterruptionsAndKeystoreLoader(hre);

  await set(setArgs, keystoreLoader, interruptions);
};

export const set = async (
  { key, force }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: UserInteractions,
): Promise<void> => {
  if (!(await validateKey(key))) {
    return interruptions.displayInvalidKeyErrorMessage(key);
  }

  // TODO: Bring in the setup password flow when implementing
  // the encrypted version.
  // await interruptions.setUpPassword();

  const keystore = (await keystoreLoader.exists())
    ? await keystoreLoader.load()
    : await keystoreLoader.create();

  if (!force && (await keystore.hasKey(key))) {
    return interruptions.displayKeyAlreadyExistsWarning(key);
  }

  const secret = await interruptions.requestSecretFromUser();

  if (secret.length === 0) {
    return interruptions.displaySecretCannotBeEmptyErrorMessage();
  }

  await keystore.addNewValue(key, secret);

  await keystoreLoader.save(keystore);

  await interruptions.displayKeySetInfoMessage(key);
};

export default taskSet;
