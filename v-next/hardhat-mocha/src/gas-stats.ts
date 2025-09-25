import { markTestWorkerDone } from "hardhat/internal/gas-analytics";

export const mochaHooks = {
  async afterAll(): Promise<void> {
    await markTestWorkerDone("mocha");
  },
};
