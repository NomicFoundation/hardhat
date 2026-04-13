import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";
import type { GetCompilationJobsResult } from "../../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import {
  createHardhatRuntimeEnvironment,
  importUserConfig,
  resolveHardhatConfigPath,
} from "../../../../../../src/hre.js";

const DUP_REMAPPING = "project/:@dup/=project/contracts/";
const ALT_REMAPPING = "project/:@alt/=project/contracts-alt/";

async function getCompilationJobs(
  hre: HardhatRuntimeEnvironment,
  rootFileNames: string[],
  options = {},
) {
  const allRootFiles = await hre.solidity.getRootFilePaths();
  const selectedRootFiles = rootFileNames.map((name) => {
    const match = allRootFiles.find((f) => f.endsWith(`${path.sep}${name}`));
    assert.ok(match !== undefined, `Root file not found: ${name}`);
    return match;
  });

  const result = await hre.solidity.getCompilationJobs(selectedRootFiles, {
    force: true,
    ...options,
  });

  assert.equal(result.success, true);

  return result;
}

function getUniqueJobs(compilationJobs: GetCompilationJobsResult) {
  return [...new Set(compilationJobs.compilationJobsPerFile.values())];
}

describe("Solidity build system regression tests: no duplicated remappings", () => {
  useFixtureProject("no-duplicated-remappings");
  let hre: HardhatRuntimeEnvironment;
  before(async () => {
    const configPath = await resolveHardhatConfigPath();
    const config = await importUserConfig(configPath);
    hre = await createHardhatRuntimeEnvironment(config, { config: configPath });
  });

  it("should not duplicate remappings from duplicate remappings.txt entries", async () => {
    const jobs = getUniqueJobs(await getCompilationJobs(hre, ["ImportA.sol"]));

    assert.equal(jobs.length, 1);

    const solcInput = await jobs[0].getSolcInput();
    assert.deepEqual(solcInput.settings.remappings, [DUP_REMAPPING]);
  });

  it("should deduplicate remappings across edges within a single graph", async () => {
    const jobs = getUniqueJobs(await getCompilationJobs(hre, ["ImportAB.sol"]));

    assert.equal(jobs.length, 1);

    const solcInput = await jobs[0].getSolcInput();
    assert.deepEqual(solcInput.settings.remappings, [DUP_REMAPPING]);
  });

  it("should deduplicate remappings when merging graphs", async () => {
    const jobs = getUniqueJobs(
      await getCompilationJobs(hre, ["ImportA.sol", "ImportB.sol"]),
    );

    assert.equal(jobs.length, 1);

    const solcInput = await jobs[0].getSolcInput();
    assert.deepEqual(solcInput.settings.remappings, [DUP_REMAPPING]);
  });

  it("should not duplicate remappings in isolated mode", async () => {
    const jobs = getUniqueJobs(
      await getCompilationJobs(hre, ["ImportA.sol", "ImportB.sol"], {
        buildProfile: "production",
      }),
    );

    assert.equal(jobs.length, 2);

    for (const job of jobs) {
      const solcInput = await job.getSolcInput();
      assert.deepEqual(solcInput.settings.remappings, [DUP_REMAPPING]);
    }
  });

  it("should preserve distinct remappings when merging graphs", async () => {
    const jobs = getUniqueJobs(
      await getCompilationJobs(hre, ["ImportA.sol", "ImportC.sol"]),
    );

    assert.equal(jobs.length, 1);

    const solcInput = await jobs[0].getSolcInput();
    assert.deepEqual(solcInput.settings.remappings, [
      ALT_REMAPPING,
      DUP_REMAPPING,
    ]);
  });
});
