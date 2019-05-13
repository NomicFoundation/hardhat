import * as fs from "fs";
import * as path from "path";

const NODE_MODULES_DIR = "node_modules";

/**
 * This function returns true only if Buidler was installed as a dependency. It
 * returns false otherwise, including when it's being linked.
 */
function isBuidlerInstalledAsADependency() {
  return __dirname.lastIndexOf(NODE_MODULES_DIR) !== -1;
}

function getBuidlerNodeModules() {
  return __dirname.substring(
    0,
    __dirname.lastIndexOf(NODE_MODULES_DIR) + NODE_MODULES_DIR.length
  );
}

let cachedIsTypescriptSupported: boolean | undefined;

export function isTypescriptSupported() {
  if (cachedIsTypescriptSupported === undefined) {
    if (isBuidlerInstalledAsADependency()) {
      const nodeModules = getBuidlerNodeModules();
      cachedIsTypescriptSupported =
        fs.existsSync(path.join(nodeModules, "typescript")) &&
        fs.existsSync(path.join(nodeModules, "ts-node"));
    } else {
      // We are inside this project (e.g. running tests), or Buidler is
      // linked and we can't get the Buidler project's node_modules, so we
      // return true.
      //
      // This is safe because Buidler will use this project's installation of
      // TypeScript and ts-node. We need them for compilation and testing, so
      // they'll always be installed.
      cachedIsTypescriptSupported = true;
    }
  }

  return cachedIsTypescriptSupported;
}

export function loadTsNodeIfPresent() {
  if (isTypescriptSupported()) {
    // See: https://github.com/nomiclabs/buidler/issues/265
    if (process.env.TS_NODE_FILES === undefined) {
      process.env.TS_NODE_FILES = "true";
    }

    // tslint:disable-next-line no-implicit-dependencies
    require("ts-node/register");
  }
}
