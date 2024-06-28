import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { findUp } from "@nomicfoundation/hardhat-utils/fs";

const JS_CONFIG_FILENAME = "hardhat.config.js";
const TS_CONFIG_FILENAME = "hardhat.config.ts";
const CJS_CONFIG_FILENAME = "hardhat.config.cjs";
const CTS_CONFIG_FILENAME = "hardhat.config.cts";

export async function isCwdInsideProject() {
  return (
    (await findUp(TS_CONFIG_FILENAME)) !== undefined ||
    (await findUp(CTS_CONFIG_FILENAME)) !== undefined ||
    (await findUp(CJS_CONFIG_FILENAME)) !== undefined ||
    (await findUp(JS_CONFIG_FILENAME)) !== undefined
  );
}

export async function getUserConfigPath() {
  const tsConfigPath = await findUp(TS_CONFIG_FILENAME);
  if (tsConfigPath !== null) {
    return tsConfigPath;
  }

  const ctsConfigPath = await findUp(CTS_CONFIG_FILENAME);
  if (ctsConfigPath !== null) {
    return ctsConfigPath;
  }

  const cjsConfigPath = await findUp(CJS_CONFIG_FILENAME);
  if (cjsConfigPath !== null) {
    return cjsConfigPath;
  }

  const jsConfigPath = await findUp(JS_CONFIG_FILENAME);
  if (jsConfigPath !== null) {
    return jsConfigPath;
  }

  throw new HardhatError(HardhatError.ERRORS.GENERAL.NOT_INSIDE_PROJECT);
}
