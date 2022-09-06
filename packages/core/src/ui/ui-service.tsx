import { render } from "ink";
import React from "react";

import { IgnitionUi } from "./components";
import { DeploymentState } from "./types";

export class UiService {
  private _enabled: boolean;
  private _deploymentState: DeploymentState | undefined;

  constructor({ enabled }: { enabled: boolean }) {
    this._enabled = enabled;
  }

  public setDeploymentState(deploymentState: DeploymentState) {
    this._deploymentState = deploymentState;
  }

  public render() {
    if (this._deploymentState === undefined) {
      throw new Error("Cannot render before deployment state set");
    }

    if (this._enabled) {
      render(<IgnitionUi deploymentState={this._deploymentState} />);
    }
  }
}
