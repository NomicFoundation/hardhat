import type { KeystoreLoader } from "../types.js";
import type { UserInteractions } from "../ui/user-interactions.js";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { checkMissingKeyTaskArgument } from "../utils/check-missing-key-task-argument.js";
import { setupRawInterruptionsAndKeystoreLoader } from "../utils/setup-raw-interruptions-and-keystore-loader.js";
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
    await setupRawInterruptionsAndKeystoreLoader(hre);

  await set(setArgs, keystoreLoader, interruptions);
};

export const set = async (
  { key, force }: TaskGetArguments,
  keystoreLoader: KeystoreLoader,
  interruptions: UserInteractions,
): Promise<void> => {
  checkMissingKeyTaskArgument(key, "keystore set");

  if (!(await validateKey(key))) {
    return interruptions.displayInvalidKeyErrorMessage(key);
  }

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
