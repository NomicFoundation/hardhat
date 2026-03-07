export interface Scenario {
  id: string;
  scenarioDir: string;
  workingDir: string;
  definition: ScenarioDefinition;
}

export type ScenarioDefinition = CloneScenarioDefinition;

export interface CloneScenarioDefinition {
  type: "clone";
  repo: string;
  commit: string;
  packageManager: "npm";
  preinstall?: string;
  install?: string;
  commands?: string[];
  tags: string[];
  env?: Record<string, string>;
  submodules?: boolean;
}
