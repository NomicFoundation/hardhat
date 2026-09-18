import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ROOT_DIR } from "./shell.ts";
import { log } from "./log.ts";

const PUBLISH_SUMMARY = resolve(ROOT_DIR, "pnpm-publish-summary.json");

export interface PublishSummary {
  publishedPackages: Array<{ name: string; version: string }>;
}

/**
 * Fail unless the publish actually published something.
 *
 * `pnpm publish` skips a package whose version already exists in the registry,
 * and Verdaccio proxies `hardhat` and `@nomicfoundation/*` to npm. So on a
 * branch whose versions are level with the released ones - `main`, or the
 * release branch between releases - publishing is a no-op and a scenario
 * silently installs the released Hardhat instead of the code under test.
 *
 * That failure is invisible in the scenario's own output: it passes. Checking
 * the publish summary is what keeps a green run meaningful.
 */
export function assertPublishedSomething(summary: PublishSummary): void {
  if (summary.publishedPackages.length === 0) {
    throw new Error(
      "Nothing was published to Verdaccio, so the scenarios would install the released\n" +
        "  Hardhat from npm rather than the code in this working tree.\n\n" +
        "  A package is only published when its version differs from the one on npm, so\n" +
        "  this is expected on a branch whose versions are level with the last release.\n\n" +
        "  Acceptance tests are meant to run on the release branch, where the versions\n" +
        "  have been bumped. To run them here anyway, bump first:\n" +
        "    pnpm verdaccio publish --since-release",
    );
  }
}

/**
 * Read the summary `pnpm publish --report-summary` leaves at the repo root,
 * and check it.
 */
export function assertPackagesPublished(
  summaryPath: string = PUBLISH_SUMMARY,
): void {
  if (!existsSync(summaryPath)) {
    throw new Error(
      `No publish summary at ${summaryPath}; cannot tell whether the local packages were published.`,
    );
  }

  const summary = JSON.parse(
    readFileSync(summaryPath, "utf-8"),
  ) as PublishSummary;

  assertPublishedSomething(summary);

  log(`Published ${summary.publishedPackages.length} packages to Verdaccio`);
}
