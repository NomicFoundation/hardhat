import { DeploymentState } from "../src/deployment-state";

type ExampleTransition = (d: DeploymentState) => void;

export interface Example {
  only?: boolean;
  description: string;
  initialData: Record<string, string[]>;
  transitions: ExampleTransition[];
}
