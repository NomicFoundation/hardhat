import * as fs from "fs";
import * as path from "path";

const NODE_MODULES_DIR = "node_modules";

function getBuidlerNodeModules() {
  // If this is the case, buidler has been installed as a dependency of a
  // project. That means that we are not running it locally.
  if (__dirname.indexOf(NODE_MODULES_DIR) !== -1) {
    __dirname.substring(
      0,
      __dirname.indexOf(NODE_MODULES_DIR) + NODE_MODULES_DIR.length
    );
  }

  // If we are running it locally, we just use our node_modules
  return path.join(__dirname, "..", "..", "..", NODE_MODULES_DIR);
}

let cachedIsTypescriptSupported: boolean | undefined;

export function isTypescriptSupported() {
  if (cachedIsTypescriptSupported === undefined) {
    const nodeModules = getBuidlerNodeModules();

    cachedIsTypescriptSupported =
      fs.existsSync(path.join(nodeModules, "typescript")) &&
      fs.existsSync(path.join(nodeModules, "ts-node"));
  }

  return cachedIsTypescriptSupported;
}

export function loadTsNodeIfPresent() {
  if (isTypescriptSupported()) {
    require("ts-node/register");
  }
}
