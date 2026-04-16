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
    defaultRuns?: number;
  };
}
