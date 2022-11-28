import {
  DeployState,
  ModuleParams,
  UpdateUiAction,
} from "@ignored/ignition-core";
import { render } from "ink";

import { IgnitionUi } from "./components";

export function renderToCli(moduleParams?: ModuleParams): UpdateUiAction {
  return (state: DeployState) => {
    render(<IgnitionUi deployState={state} moduleParams={moduleParams} />);
  };
}
