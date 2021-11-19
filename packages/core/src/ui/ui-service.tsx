import React from "react";
import { render } from "ink";

import { IgnitionUi } from "./components";
import { UiData } from "./ui-data";

export class ExecutorUiService {
  constructor(
    private _moduleId: string,
    private _executorId: string,
    private _uiService: UiService
  ) {}

  public executorStart() {
    this._uiService.executorStart(this._moduleId, this._executorId);
  }

  public executorSuccessful() {
    this._uiService.executorSuccessful(this._moduleId, this._executorId);
  }

  public executorHold(reason: string) {
    this._uiService.executorHold(this._moduleId, this._executorId, reason);
  }

  public executorFailure(reason: string) {
    this._uiService.executorFailure(this._moduleId, this._executorId, reason);
  }
}

export class UiService {
  private _enabled: boolean;
  private _uiData: UiData;

  constructor({ enabled, uiData }: { enabled: boolean; uiData: UiData }) {
    this._enabled = enabled;
    this._uiData = uiData;
  }

  public executorStart(moduleId: string, executorId: string) {
    this._uiData.executorStart(moduleId, executorId);
    this._render();
  }

  public executorSuccessful(moduleId: string, executorId: string) {
    this._uiData.executorSuccessful(moduleId, executorId);
    this._render();
  }

  public executorHold(moduleId: string, executorId: string, reason: string) {
    this._uiData.executorHold(moduleId, executorId, reason);
    this._render();
  }

  public executorFailure(moduleId: string, executorId: string, reason: string) {
    this._uiData.executorFailure(moduleId, executorId, reason);
    this._render();
  }

  private _render() {
    if (this._enabled) {
      render(<IgnitionUi uiData={this._uiData} />);
    }
  }
}
