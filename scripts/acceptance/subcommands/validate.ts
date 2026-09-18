import {
  discoverScenarioPaths,
  loadScenario,
  SCENARIOS_DIR,
} from "../helpers/scenario.ts";
import { fmt, log, logStep } from "../helpers/log.ts";
import { selectScenarioPaths } from "../helpers/select.ts";

/**
 * Check every scenario without running one.
 *
 * Cheap enough to run on every change to `acceptance/`, and it catches the
 * mistakes that would otherwise only surface after a multi-minute install.
 */
export function validate(scenario: string | undefined): void {
  logStep("Validating scenarios");

  const scenarioPaths = selectScenarioPaths(
    discoverScenarioPaths(SCENARIOS_DIR),
    scenario,
  );

  const failures: string[] = [];

  for (const scenarioPath of scenarioPaths) {
    try {
      const { slug } = loadScenario(scenarioPath);

      log(`${fmt.success("valid")}   ${fmt.scenario(slug)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      log(`${fmt.fail("invalid")} ${fmt.scenario(scenarioPath)}`);
      log(`  ${message}`);

      failures.push(scenarioPath);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} of ${scenarioPaths.length} scenarios are invalid`,
    );
  }

  log(fmt.success(`All ${scenarioPaths.length} scenarios are valid`));
}
