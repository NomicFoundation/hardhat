import { render } from "ink";
import React from "react";

import { DeploymentState } from "../deployment-state";

import { IgnitionUi } from "./components";

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

  public render() {
    if (this._enabled) {
      render(<IgnitionUi deploymentState={this._deploymentState} />);
    }
  }
}
