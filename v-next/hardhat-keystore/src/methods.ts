import chalk from "chalk";

import { io } from "./io.js";
import { isAuthorized } from "./password-manager.js";
import {
  addNewSecret,
  getKeystore,
  removeKey,
  setupKeystore,
  validateKey,
} from "./utils.js";

export const PLUGIN_ID = "hardhat-keystore";

export async function set(key: string, force: boolean = false): Promise<void> {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    await setupKeystore();
  }

  if (!validateKey(key)) {
    return;
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  await addNewSecret(key, force);

  io.info(`Key "${key}" set`);
}

export async function get(key: string): Promise<string | undefined> {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    showMsgNoKeystoreSet();
    return;
  }

  if ((await isAuthorized()) === false) {
    return;
  }
  if (keystore.keys[key] === undefined) {
    io.error(`Key "${key}" not found`);
    return;
  }

  io.info(keystore.keys[key]);

  return keystore.keys[key];
}

export async function list(): Promise<void> {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    return showMsgNoKeystoreSet();
  }

  // No authorization needed, it only shows the keys, not the secret values
  if (Object.keys(keystore.keys).length === 0) {
    io.info("The keystore does not contain any keys.");
    return;
  }

  io.info("Keys:");
  for (const key of Object.keys(keystore.keys)) {
    io.info(key);
  }
}

export async function remove(key: string): Promise<void> {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    return showMsgNoKeystoreSet();
  }

  if ((await isAuthorized()) === false) {
    return;
  }

  await removeKey(key);
}

function showMsgNoKeystoreSet(): void {
  io.info(
    `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
  );
}
