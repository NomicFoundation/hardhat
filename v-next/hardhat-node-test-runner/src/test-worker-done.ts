import { after } from "node:test";

import hre from "hardhat";

after(async () => {
  await hre.hooks.runHandlerChain(
    "test",
    "onTestWorkerDone",
    ["nodejs"],
    async () => {},
  );
});
