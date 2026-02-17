import type { HardhatRuntimeEnvironmentHooks } from "hardhat/types/hooks";

import { createConnectOnBefore } from "../connect-on-before/create-connect-on-before.js";

export default async (): Promise<Partial<HardhatRuntimeEnvironmentHooks>> => ({
  created: async (_context, hre) => {
    const connectOnBefore = createConnectOnBefore(hre.network);

    hre.network.mocha = {
      connectOnBefore,
    };
  },
});
