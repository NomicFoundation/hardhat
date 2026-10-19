import type { TestProfile, UnprofiledTest } from "./model.js";
import type { SuiteResult } from "@nomicfoundation/edr";

import path from "node:path";

import { createNonCryptographicHashId } from "@nomicfoundation/hardhat-utils/crypto";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import {
  exists,
  remove,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { sanitizeFilename } from "@nomicfoundation/hardhat-utils/path";

import { isProfiled, profileTest } from "./model.js";
import { renderSummary } from "./summary.js";

const log = createDebug("hardhat:core:solidity-test:gas-profile");

/** Keeps file names well under the usual 255-byte limit. */
const MAX_FILE_NAME_BYTES = 200;

/**
 * The warning printed when isolation is on, naming what turned it on.
 *
 * Measured on EDR 0.23.0, isolation also subtracts refunds twice, and a call
 * that halts or gets only the 2,300 gas stipend reports 0 gas. Those are EDR
 * bugs, fixed upstream in NomicFoundation/edr#1844, so they aren't described
 * to users.
 */
export function isolationWarning(sources: string[]): string {
  return `Warning: isolation is on (${sources.join(" and ")}). Each top-level call then runs as its own transaction, so its gas includes that transaction's cost and the profile differs from a run without isolation.`;
}

export interface GasProfileTests {
  /** Sorted by test gas, heaviest first. */
  profiles: TestProfile[];
  unprofiled: UnprofiledTest[];
}

export function collectGasProfiles(
  suiteResults: SuiteResult[],
): GasProfileTests {
  const profiles: TestProfile[] = [];
  const unprofiled: UnprofiledTest[] = [];
  for (const suite of suiteResults) {
    for (const testResult of suite.testResults) {
      const test = profileTest(suite.id.name, testResult);
      if (isProfiled(test)) {
        profiles.push(test);
      } else {
        unprofiled.push(test);
      }
    }
  }
  profiles.sort((a, b) => b.testGas - a.testGas);
  return { profiles, unprofiled };
}

/**
 * A `<Contract>.<test>.folded` name per test, safe on every OS: sanitized,
 * shortened with a hash when too long, and unique even on file systems that
 * ignore case.
 */
export async function foldedFileNames(
  profiles: TestProfile[],
): Promise<string[]> {
  const used = new Set<string>();
  const names = new Map<TestProfile, string>();
  // Suffixes for names that differ only in case go in name order, so they
  // don't change when gas changes.
  const byName = [...profiles].sort((a, b) =>
    a.fullName < b.fullName ? -1 : a.fullName > b.fullName ? 1 : 0,
  );
  for (const test of byName) {
    const fullName = `${test.suite}.${test.testName}`;
    let base = sanitizeFilename(fullName);
    if (Buffer.byteLength(base) > MAX_FILE_NAME_BYTES) {
      const hash = (await createNonCryptographicHashId(fullName)).slice(0, 8);
      const chars = [...base];
      while (Buffer.byteLength(chars.join("")) > MAX_FILE_NAME_BYTES - 9) {
        chars.pop();
      }
      base = `${chars.join("")}-${hash}`;
    }
    let name = `${base}.folded`;
    for (let n = 2; used.has(name.toLowerCase()); n++) {
      name = `${base}-${n}.folded`;
    }
    used.add(name.toLowerCase());
    names.set(test, name);
  }
  return profiles.map((test) => names.get(test) ?? "");
}

/**
 * Replaces `outputDir` with one folded-stacks file per profiled test, and
 * returns the text to print. When no test ran, it only removes `outputDir`.
 */
export async function writeGasProfile(
  suiteResults: SuiteResult[],
  outputDir: string,
  isolation: boolean,
): Promise<string> {
  const { profiles, unprofiled } = collectGasProfiles(suiteResults);
  const hadOutput = await exists(outputDir);
  await remove(outputDir);

  if (profiles.length === 0 && unprofiled.length === 0) {
    return hadOutput
      ? "Gas profile: no Solidity tests ran, so the previous gas profile was removed."
      : "Gas profile: no Solidity tests ran, nothing written.";
  }

  const foldedDir = path.join(outputDir, "folded");
  const names = await foldedFileNames(profiles);
  for (const [i, test] of profiles.entries()) {
    await writeUtf8File(
      path.join(foldedDir, names[i]),
      `${test.folded.join("\n")}\n`,
    );
  }
  log(`Wrote ${profiles.length} folded files to ${foldedDir}`);

  const summary = renderSummary(profiles, unprofiled, isolation);
  if (profiles.length === 0) {
    return summary;
  }
  return `${summary}\n\nSaved gas profile (folded stacks, ${profiles.length} file${profiles.length === 1 ? "" : "s"}) to ${foldedDir}`;
}
