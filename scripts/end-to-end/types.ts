export interface Scenario {
  id: string;
  scenarioDir: string;
  workingDir: string;
  definition: ScenarioDefinition;
}

export interface ScenarioDefinition {
  description: string;
  repo: string;
  commit: string;
  packageManager: "npm" | "bun" | "yarn" | "pnpm";
  defaultCommand: string;
  preinstall?: string;
  install?: string;
  tags: string[];
  env?: Record<string, string>;
  submodules?: boolean;
  disabled?: true;
  benchmark?: {
    /**
     * Whether to skip this scenario in the regression harness.
     */
    skip?: true;
    /**
     * The commands to run, in order, in the regression harness.
     */
    commands?: Record<string, CommandConfig>;
  };
}

/**
 * A benchmark entry in a scenario's `benchmark.commands` map. Exactly one of
 * the two variants applies, discriminated by the presence of `steps`:
 *
 * - {@link CommandVariant}: a single command benchmarked with hyperfine.
 * - {@link StepsVariant}: an ordered sequence of steps, each timed in-process.
 */
export type CommandConfig = CommandVariant | StepsVariant;

export interface CommandVariant {
  /**
   * The number of times to run this command in the regression harness.
   */
  runs: number;
  /**
   * An optional preparatory command to run each time before this command
   * in the regression harness.
   */
  prepare?: string;
  /**
   * The command to benchmark in the regression harness.
   */
  command: string;
}

export interface StepsVariant {
  /**
   * The number of times to run the whole step sequence in the regression
   * harness.
   */
  runs: number;
  /**
   * The steps to run, in order, once per run. Each step is timed individually
   * in-process (not via hyperfine), so the shared state between steps avoids
   * the per-run reset cost of a hyperfine `prepare`. The key doubles as the
   * benchmark name on disk for measured steps.
   */
  steps: Record<string, StepConfig>;
}

export interface StepConfig {
  /**
   * The shell command to run for this step.
   */
  command: string;
  /**
   * Whether to emit a benchmark entry for this step. Defaults to `true`; set
   * to `false` for setup/reset steps that should run but not be measured.
   */
  measure?: boolean;
}
