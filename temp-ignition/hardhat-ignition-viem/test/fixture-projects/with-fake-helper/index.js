const { extendEnvironment } = require("hardhat/config");

extendEnvironment((hre) => {
  hre.ignition = {
    type: "ethers",
  };
});
