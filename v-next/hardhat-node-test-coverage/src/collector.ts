import type { CoverageReport } from "hardhat/types/coverage";
import type { NetworkHooks } from "hardhat/types/hooks";

import { after, before } from "node:test";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { readJsonFile, writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import { MultiProcessMutex } from "@nomicfoundation/hardhat-utils/synchronization";
import hre from "hardhat";

const report: CoverageReport = {
  markerIds: [],
};

before(() => {
  const networkHooks: Partial<NetworkHooks> = {
    newConnection: async (
      context,
      networkName,
      chainType,
      networkConfigOverride,
      next,
    ) => {
      // TODO: Define networkConfigOverride.observability.codeCoverage.onCollectedCoverageCallback
      // if this is an EDR network config
      return next(context, networkName, chainType, networkConfigOverride);
    },
  };

  hre.hooks.registerHandlers("network", networkHooks);
});

after(async () => {
  const mutex = new MultiProcessMutex("coverage");

  await mutex.use(async () => {
    assertHardhatInvariant(
      process.env.HARDHAT_NODE_TEST_COVERAGE_PATH !== undefined,
      "HARDHAT_NODE_TEST_COVERAGE_PATH should be defined",
    );
    const currentReport: CoverageReport = await readJsonFile(
      process.env.HARDHAT_NODE_TEST_COVERAGE_PATH,
    );
    const updatedReport: CoverageReport = {
      markerIds: [...currentReport.markerIds, ...report.markerIds],
    };
    await writeJsonFile(
      process.env.HARDHAT_NODE_TEST_COVERAGE_PATH,
      updatedReport,
    );
  });
});
