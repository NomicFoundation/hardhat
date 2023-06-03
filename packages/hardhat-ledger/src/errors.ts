import { NomicLabsHardhatPluginError } from "hardhat/src/internal/core/errors";

export class LedgerProviderError extends NomicLabsHardhatPluginError {
  constructor(message: string) {
    super("@nomiclabs/hardhat-ledger", message);
  }
}
