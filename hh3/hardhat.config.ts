import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        // Same compiler as the HH2 project so the bytecode (and therefore
        // the storage layout / opcodes) is identical on both sides.
        version: "0.8.9",
      },
    },
  },
});
