export class LedgerProviderError extends Error {
  public pluginName: string;

  constructor(message: string) {
    super(message);

    // TODO: Test this name
    this.pluginName = "@nomiclabs/hardhat-ledger";
  }
}

export class DerivationPathError extends LedgerProviderError {
  constructor(message: string, public path: string) {
    super(message);
  }
}
