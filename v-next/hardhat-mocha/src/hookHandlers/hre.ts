import type { HardhatRuntimeEnvironmentHooks } from "hardhat/types/hooks";

import { createConnectOnBefore } from "../connect-on-before/create-connect-on-before.js";
import { createConnectToSingleton } from "../connect-on-before/create-connect-to-singleton.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (_context, hre) => {
    const connectOnBefore = createConnectOnBefore(hre.network);
    const connectToSingleton = createConnectToSingleton(hre.network);

    hre.network.mocha = {
      connectOnBefore,
      connectToSingleton,
    };
  },
});
