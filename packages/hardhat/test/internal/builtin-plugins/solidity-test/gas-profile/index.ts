import type { TestProfile } from "../../../../../src/internal/builtin-plugins/solidity-test/gas-profile/model.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { createTmpDir } from "@nomicfoundation/hardhat-test-utils";
import {
  exists,
  readdir,
  readUtf8File,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

import {
  collectGasProfiles,
  foldedFileNames,
  writeGasProfile,
} from "../../../../../src/internal/builtin-plugins/solidity-test/gas-profile/index.js";
import {
  createCall,
  createUnitTestResult,
  depositTestResult,
} from "../../../../helpers/gas-profile.js";
import { createSuiteResult } from "../../gas-analytics/suite-result-helpers.js";

function simpleTest(name: string) {
  return createUnitTestResult(`${name}()`, 100, [
    createCall({ contract: "T", fn: name, gasUsed: 100 }),
  ]);
}

function profilesOf(suite: string, names: string[]): TestProfile[] {
  return collectGasProfiles([createSuiteResult(suite, names.map(simpleTest))])
    .profiles;
}

describe("gas-profile/index", () => {
  const tmp = createTmpDir("gas-profile-index", "test");

  it("names folded files after the contract and test", async () => {
    assert.deepEqual(await foldedFileNames(profilesOf("T", ["test_a"])), [
      "T.test_a.folded",
    ]);
  });

  it("keeps names unique on case-insensitive file systems", async () => {
    assert.deepEqual(
      await foldedFileNames(profilesOf("T", ["testCase", "testcase"])),
      ["T.testCase.folded", "T.testcase-2.folded"],
    );
  });

  it("assigns case suffixes by name, not by gas", async () => {
    const { profiles } = collectGasProfiles([
      createSuiteResult("T", [
        createUnitTestResult("testcase()", 900, [
          createCall({ contract: "T", fn: "testcase", gasUsed: 900 }),
        ]),
        simpleTest("testCase"),
      ]),
    ]);
    assert.equal(profiles[0].testName, "testcase");

    assert.deepEqual(await foldedFileNames(profiles), [
      "T.testcase-2.folded",
      "T.testCase.folded",
    ]);
  });

  it("shortens long names and adds a hash", async () => {
    const long = `test_${"a".repeat(300)}`;
    const [name, other] = await foldedFileNames(
      profilesOf("T", [long, `${long}b`]),
    );

    assert.ok(
      Buffer.byteLength(name) <= 207,
      "expected a name of at most 200 bytes plus the extension",
    );
    assert.match(name, /^T\.test_a+-[0-9a-f]{8}\.folded$/);
    assert.notEqual(name, other);
  });

  it("replaces the previous output", async () => {
    const outputDir = path.join(tmp.path, "gas-profile");
    await writeUtf8File(path.join(outputDir, "folded", "Old.test.folded"), "");

    const printed = await writeGasProfile(
      [createSuiteResult("GasTest", [depositTestResult()])],
      outputDir,
      false,
    );

    assert.ok(
      await exists(path.join(outputDir, "index.html")),
      "expected the HTML report",
    );
    assert.deepEqual(await readdir(path.join(outputDir, "folded")), [
      "GasTest.test_deposit.folded",
    ]);
    assert.equal(
      await readUtf8File(
        path.join(outputDir, "folded", "GasTest.test_deposit.folded"),
      ),
      "GasTest.test_deposit 6322\nGasTest.test_deposit;Vault.deposit 30437\nGasTest.test_deposit;Vault.deposit;Token.transfer 6634\nGasTest.test_deposit;Vault.shares 801\n",
    );
    assert.ok(
      printed.endsWith(
        `Saved gas profile to ${path.join(outputDir, "index.html")}\nSaved folded stacks to ${path.join(outputDir, "folded")} (1 file)`,
      ),
      "expected the saved path last",
    );
  });

  it("removes the previous output when no test ran", async () => {
    const outputDir = path.join(tmp.path, "gas-profile");
    await writeUtf8File(path.join(outputDir, "folded", "Old.test.folded"), "");

    assert.equal(
      await writeGasProfile([createSuiteResult("T", [])], outputDir, false),
      "Gas profile: no Solidity tests ran, so the previous gas profile was removed.",
    );
    assert.equal(await exists(outputDir), false);
    assert.equal(
      await writeGasProfile([], outputDir, false),
      "Gas profile: no Solidity tests ran, nothing written.",
    );
  });
});
