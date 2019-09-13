import { MethodNotFoundError } from "../errors";
import { validateParams } from "../input";
import { BuidlerNode } from "../node";

// tslint:disable only-buidler-error

export class BuidlerModule {
  constructor(private readonly _node: BuidlerNode) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "buidler_getStackTraceFailuresCount":
        return this._getStackTraceFailuresCountAction(
          ...this._getStackTraceFailuresCountParams(params)
        );
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // buidler_getStackTraceFailuresCount

  private _getStackTraceFailuresCountParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _getStackTraceFailuresCountAction(): Promise<number> {
    return this._node.getStackTraceFailuresCount();
  }
}
