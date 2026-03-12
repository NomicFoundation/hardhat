import hre from "hardhat";

export const mochaHooks = {
  async afterAll(): Promise<void> {
    await hre.hooks.runHandlerChain(
      "test",
      "onTestWorkerDone",
      ["mocha"],
      async () => {},
    );
  },
};
