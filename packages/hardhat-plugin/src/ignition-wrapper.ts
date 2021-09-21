import { Ignition } from "ignition";

export class IgnitionWrapper {
  private _ignition: Ignition;

  constructor() {
    this._ignition = new Ignition();
  }

  public deploy() {
    console.log("deploy");
  }
}
