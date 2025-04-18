import type { CoverageReport } from "hardhat/types/coverage";
import type { NetworkHooks } from "hardhat/types/hooks";
import type { EthereumProvider } from "hardhat/types/providers";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { after, before } from "node:test";

import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import hre from "hardhat";

const report: CoverageReport = {
  markerIds: [],
};
const providers: Record<number, EthereumProvider> = {};

before(async () => {
  const networkHooks: Partial<NetworkHooks> = {
    newConnection: async (
      context,
      networkName,
      chainType,
      networkConfigOverride,
      next,
    ) => {
      // TODO: Register for callbacks either with the EDR provider or the network
      // manager if EDR exposes callback push API

      const connection = await next(
        context,
        networkName,
        chainType,
        networkConfigOverride,
      );

      if (connection.networkConfig.type === "edr") {
        providers[connection.id] = connection.provider;
      }

      return connection;
    },
    // NOTE: If close connection hooks were triggered for all the connections before
    // a process exits, we could move this entire logic to the builtin:coverage plugin
    // Otherwise, we need to rely on test runner specific after block as an indication
    // for when all the tests are done
    closeConnection: async (context, connection, next) => {
      if (connection.networkConfig.type === "edr") {
        // TODO: Get the coverage data from the EDR provider before it is closed
        // if it exposes pull API instead of callback push API
        delete providers[connection.id];
      }

      await next(context, connection);
    },
  };

  hre.hooks.registerHandlers("network", networkHooks);
});

after(async () => {
  if (
    hre.globalOptions.coverage === true &&
    process.env.HARDHAT_COVERAGE_DIR_PATH !== undefined
  ) {
    for (const _provider of Object.values(providers)) {
      // TODO: Get the coverage data from the EDR provider
      // if it exposes pull API instead of callback push API
    }
    const reportPath = path.join(
      process.env.HARDHAT_COVERAGE_DIR_PATH,
      `${randomUUID()}.json`,
    );
    await writeJsonFile(reportPath, report);
  }
});
