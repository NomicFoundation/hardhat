import { NomicLabsHardhatPluginError } from "hardhat/src/internal/core/errors";

export class LedgerProviderError extends NomicLabsHardhatPluginError {
  constructor(message: string) {
    // TODO: Test this name
    super("@nomiclabs/hardhat-ledger", message);
  }
}
