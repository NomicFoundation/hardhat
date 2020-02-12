const os = require("os");
const shell = require("shelljs");

shell.config.fatal = true; // throw if a command fails

const isLinux = os.type() === "Linux";
const isWindows = os.type() === "Windows_NT";

shell.exec("npx lerna exec -- npm run build");
shell.exec("npx lerna exec -- npm run build-test");
shell.exec(
  `npx lerna exec ${!isLinux ? '--ignore "@nomiclabs/buidler-vyper"' : ""} ${
    isWindows ? '--ignore "@nomiclabs/buidler-solpp"' : ""
  } --concurrency 1 -- npm run test`,
  {
    TS_NODE_TRANSPILE_ONLY: "true"
  }
);
