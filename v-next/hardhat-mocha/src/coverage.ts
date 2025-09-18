import { markTestWorkerDone } from "hardhat/internal/coverage";

export const mochaHooks = {
  async afterAll(): Promise<void> {
    await markTestWorkerDone("mocha");
  },
};
