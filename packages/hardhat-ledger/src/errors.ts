export class LedgerProviderError extends Error {
  public pluginName: string = "@nomiclabs/hardhat-ledger";
}

export class DerivationPathError extends LedgerProviderError {
  constructor(message: string, public path: string) {
    super(message);
  }
}
