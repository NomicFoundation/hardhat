import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
    },
  },
  paths: {
    sources: "./src",
    artifacts: "./hh3-artifacts",
  },
});
