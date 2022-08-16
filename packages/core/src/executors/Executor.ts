import setupDebug, { IDebugger } from "debug";

import { FutureState } from "../deployment-state";
import { InternalFuture } from "../futures/InternalFuture";
import { FutureOutput, Resolved } from "../futures/types";
import type { Services } from "../services/types";

import { Hold } from "./Hold";

export abstract class Executor<I = unknown, O extends FutureOutput = any> {
  private _dummyInput!: I;
  private _dummyOutput!: O;
  private state: "ready" | "running" | "hold" | "success" | "failure" = "ready";
  private result?: any;
  private error?: any;
  private holdReason?: string;
  private _debug: IDebugger;

  constructor(public readonly future: InternalFuture<I, O>) {
    const recipeId = future.recipeId;
    const futureId = future.id;
    this._debug = setupDebug(`ignition:executor:${recipeId}:${futureId}`);
  }

  abstract execute(input: Resolved<I>, services: Services): Promise<O>;
  abstract validate(input: I, services: Services): Promise<string[]>;
  abstract getDescription(): string;

  public async run(
    input: Resolved<I>,
    services: Services,
    onStateChange: (newState: FutureState) => void
  ) {
    try {
      this._debug("Start running");
      this._setRunning();
      onStateChange(FutureState.running());
      const result = await this.execute(input, services);
      this._debug("Ended successfully");
      this._setSuccess(result);
      onStateChange(FutureState.success(result));
    } catch (e: any) {
      if (e instanceof Hold) {
        this._debug("Ended with hold");
        this._setHold(e.reason);
        onStateChange(FutureState.hold(e.reason));
      } else {
        this._debug("Ended with error");
        this._setFailure(e);
        onStateChange(FutureState.failure(e));
      }
    }
  }

  public isReady() {
    return this.state === "ready";
  }

  public isRunning() {
    return this.state === "running";
  }

  public isHold() {
    return this.state === "hold";
  }

  public getHoldReason(): string {
    if (this.holdReason === undefined) {
      throw new Error(
        `[executor ${this.future.id}] assertion error: no hold reason`
      );
    }

    return this.holdReason;
  }

  public isSuccess() {
    return this.state === "success";
  }

  public getResult() {
    if (this.result === undefined) {
      throw new Error(
        `[executor ${this.future.id}] assertion error: no result`
      );
    }

    return this.result;
  }

  public isFailure() {
    return this.state === "failure";
  }

  public getError() {
    if (this.error === undefined) {
      throw new Error("assertion error");
    }

    return this.error;
  }

  private _setRunning() {
    this.state = "running";
  }
  private _setHold(reason: string) {
    this.state = "hold";
    this.holdReason = reason;
  }
  private _setSuccess(result: any) {
    this.state = "success";
    this.result = result;
  }
  private _setFailure(err: Error) {
    this.state = "failure";
    this.error = err;
  }
}
