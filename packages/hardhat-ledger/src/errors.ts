export class LedgerProviderError extends Error {
  public pluginName: string = "@nomiclabs/hardhat-ledger";
}

export class NotControlledAddressError extends LedgerProviderError {
  constructor(message: string, public address: string) {
    super(message);
  }
}

export class ConnectionError extends LedgerProviderError {}

export class DerivationPathError extends LedgerProviderError {
  constructor(message: string, public path: string) {
    super(message);
  }
}
