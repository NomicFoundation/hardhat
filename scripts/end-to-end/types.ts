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

export interface CommandConfig {
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
