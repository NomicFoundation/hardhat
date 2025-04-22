import { after } from "node:test";

import hre from "hardhat";

after(async () => {
  await hre.coverage.save();
});
