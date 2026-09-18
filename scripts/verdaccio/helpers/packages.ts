import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ROOT_DIR } from "./shell.ts";

const PACKAGES_DIR = resolve(ROOT_DIR, "packages");

/**
 * The names of the packages this monorepo publishes.
 *
 * Derived from each package's own `private` flag rather than a list kept by
 * hand, because the list is used to decide which names Verdaccio serves
 * authoritatively: a package missing from it would silently fall back to npm,
 * and a package wrongly on it would 404. `pnpm publish` uses the same `private`
 * flag to decide what to publish, so the two cannot drift apart.
 */
export function listPublishablePackageNames(): string[] {
  const names: string[] = [];

  for (const dir of readdirSync(PACKAGES_DIR)) {
    let pkgJson: { name?: string; private?: boolean };

    try {
      pkgJson = JSON.parse(
        readFileSync(resolve(PACKAGES_DIR, dir, "package.json"), "utf-8"),
      );
    } catch {
      continue;
    }

    if (pkgJson.private === true || pkgJson.name === undefined) {
      continue;
    }

    names.push(pkgJson.name);
  }

  return names.sort();
}
