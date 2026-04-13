import type { HardhatPlugin } from "hardhat/types/plugins";

const hardhatFoundry: HardhatPlugin = {
  id: "@nomicfoundation/hardhat-foundry",
  hookHandlers: {
    solidity: async () => await import("./internal/hook-handlers/solidity.js"),
  },
};

export default hardhatFoundry;
