import { UiData } from "../src/ui/ui-data";

type ExampleTransition = (d: UiData) => void;

export interface Example {
  only?: boolean;
  description: string;
  initialData: Record<string, string[]>;
  transitions: ExampleTransition[];
}
