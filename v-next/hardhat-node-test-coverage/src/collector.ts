import type { CoverageReport } from "hardhat/types/coverage";
import type { NetworkHooks } from "hardhat/types/hooks";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { after, before } from "node:test";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";
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
  assertHardhatInvariant(
    process.env.HARDHAT_NODE_TEST_COVERAGE_DIR_PATH !== undefined,
    "HARDHAT_NODE_TEST_COVERAGE_DIR_PATH should be defined",
  );
  const reportPath = path.join(
    process.env.HARDHAT_NODE_TEST_COVERAGE_DIR_PATH,
    `${randomUUID()}.json`,
  );
  await writeJsonFile(reportPath, report);
});
