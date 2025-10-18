import { after } from "node:test";

import { markTestWorkerDone } from "hardhat/internal/gas-analytics";

after(async () => {
  await markTestWorkerDone("nodejs");
});
