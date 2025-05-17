import { after } from "node:test";

import { markTestWorkerDone } from "hardhat/internal/coverage";

after(async () => {
  await markTestWorkerDone("node");
});
