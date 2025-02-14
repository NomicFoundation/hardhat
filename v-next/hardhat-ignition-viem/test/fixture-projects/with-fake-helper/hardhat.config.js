require("./index");
require("../../../src/index");

export default {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      mining: {
        auto: false,
      },
    },
  },
};
