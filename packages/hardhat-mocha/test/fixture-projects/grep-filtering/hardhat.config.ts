import type { HardhatUserConfig } from "hardhat/config";

import HardhatMochaPlugin from "../../../src/index.js";

// `test.mocha.parallel` is driven by the `HH_MOCHA_PARALLEL` env var (the task
// exposes no CLI flag for it) so test/index.ts can run this single fixture in
// both sequential and parallel mode by toggling that var.
const config: HardhatUserConfig = {
  plugins: [HardhatMochaPlugin],
  test: {
    mocha: {
      parallel: process.env.HH_MOCHA_PARALLEL === "true",
    },
  },
};

export default config;
