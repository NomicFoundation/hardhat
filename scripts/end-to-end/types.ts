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
    skip?: true;
    commands?: Record<string, CommandConfig>;
  };
}

export interface CommandConfig {
  runs: number;
  prepare?: string;
  command: string;
}
