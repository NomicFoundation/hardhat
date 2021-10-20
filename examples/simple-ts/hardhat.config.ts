import { extendEnvironment } from "hardhat/config"
import "@nomiclabs/hardhat-ignition"

export default {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      // mining: {
      //   auto: false
      // }
    },
  },
};
