import { basename, dirname } from "node:path";

/**
 * Narrow a list of scenario paths to the one named by `--scenario`, which
 * accepts the slug (`minimal`) or a path to the directory or the file.
 */
export function selectScenarioPaths(
  scenarioPaths: string[],
  scenario: string | undefined,
): string[] {
  if (scenarioPaths.length === 0) {
    throw new Error("No scenarios found");
  }

  if (scenario === undefined) {
    return scenarioPaths;
  }

  const wanted = basename(
    scenario.replace(/\/scenario\.md$/, "").replace(/\/$/, ""),
  );

  const selected = scenarioPaths.filter(
    (scenarioPath) => basename(dirname(scenarioPath)) === wanted,
  );

  if (selected.length === 0) {
    const available = scenarioPaths
      .map((scenarioPath) => `  - ${basename(dirname(scenarioPath))}`)
      .join("\n");

    throw new Error(`No scenario named "${wanted}". Available:\n${available}`);
  }

  return selected;
}
