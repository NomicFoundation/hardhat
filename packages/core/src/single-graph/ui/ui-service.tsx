import { render } from "ink";
import React from "react";

import { IgnitionUi } from "./components";
import { DeploymentState } from "./types";

export class UiService {
  private _enabled: boolean;
  private _deploymentState: DeploymentState;

  constructor({
    enabled,
    deploymentState,
  }: {
    enabled: boolean;
    deploymentState: DeploymentState;
  }) {
    this._enabled = enabled;
    this._deploymentState = deploymentState;
  }

  public setDeploymentState(deploymentState: DeploymentState) {
    this._deploymentState = deploymentState;
  }

  public render() {
    if (this._enabled) {
      render(<IgnitionUi deploymentState={this._deploymentState} />);
    }
  }
}
