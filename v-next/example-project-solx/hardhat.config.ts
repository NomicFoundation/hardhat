import { defineConfig } from "hardhat/config";
import hardhatSolx from "@nomicfoundation/hardhat-solx";

export default defineConfig({
  plugins: [hardhatSolx],
  solidity: {
    profiles: {
      default: {
        version: "0.8.29",
      },
      solx: {
        type: "solx",
        // solx currently only supports Solidity version 0.8.33
        version: "0.8.33",
      },
    },
  },
});
