import { DeployState } from "@ignored/ignition-core";
import { render } from "ink";

import { IgnitionUi } from "./components";

export function renderToCli(state: DeployState) {
  render(<IgnitionUi deployState={state} />);
}
