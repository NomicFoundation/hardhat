import type { HardhatUserConfig } from "../../../../src/types/config.js";

const config: HardhatUserConfig = {
  solidity: "0.8.23",
  paths: {
    sources: {
      solidity: ["contracts", "test"],
    },
  },
};

export default config;
