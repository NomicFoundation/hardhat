import hre from "hardhat";

export const mochaHooks = {
  async afterAll(): Promise<void> {
    await hre.hooks.runSequentialHandlers("test", "onTestWorkerDone", [
      "mocha",
    ]);
  },
};
