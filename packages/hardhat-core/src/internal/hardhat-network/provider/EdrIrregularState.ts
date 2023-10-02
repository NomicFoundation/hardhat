import { IrregularState } from "rethnet-evm";

/**
 * Wrapper for EDR's `IrregularState` object.
 */
export class EdrIrregularState {
  private _state: IrregularState = new IrregularState();

  public asInner(): IrregularState {
    return this._state;
  }

  public setInner(state: IrregularState): void {
    this._state = state;
  }
}
