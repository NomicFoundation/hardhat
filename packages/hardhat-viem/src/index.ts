import { extendEnvironment } from "hardhat/config";

import {
  getPublicClient,
  getWalletClients,
  getTestClient,
} from "./internal/clients";
import "./type-extensions";
import "./internal/tasks";

extendEnvironment((hre) => {
  hre.viem = {
    getPublicClient,
    getWalletClients,
    getTestClient,
  };
});
