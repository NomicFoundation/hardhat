import chalk from "chalk";

import {
  addNewSecret,
  getKeystore,
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

  // TODO:
  // if (!isAuthorized()) {
  //   return;
  // }

  await addNewSecret(key, force);
}

export async function get(key: string): Promise<void> {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    return showMsgNoKeystoreSet();
  }

  // TODO:
  // if (!isAuthorized()) {
  //   return;
  // }

  if (keystore.keys[key] === undefined) {
    console.log(chalk.red(`Key "${key}" not found`));
    return;
  }

  console.log(keystore.keys[key]);
}

export async function list(): Promise<void> {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    return showMsgNoKeystoreSet();
  }

  // No authorization needed, it only shows the keys, not the secret values
  if (Object.keys(keystore.keys).length === 0) {
    console.log("The keystore does not contain any keys.");
    return;
  }

  console.log("Keys:");
  for (const key of Object.keys(keystore.keys)) {
    console.log(key);
  }
}

export async function remove(key: string): Promise<void> {
  const keystore = await getKeystore();

  if (keystore === undefined) {
    return showMsgNoKeystoreSet();
  }

  // TODO:
  // if (!isAuthorized()) {
  //   return;
  // }

  if (keystore.keys[key] === undefined) {
    console.log(chalk.red(`Key "${key}" not found`));
    return;
  }

  delete keystore.keys[key];

  console.log(`Key "${key}" removed`);
}

function showMsgNoKeystoreSet(): void {
  console.log(
    `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
  );
}
