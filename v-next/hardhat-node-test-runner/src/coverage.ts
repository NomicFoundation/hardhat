import { after } from "node:test";

import { saveCoverageData } from "hardhat/internal/coverage";

after(async () => {
  await saveCoverageData();
});
