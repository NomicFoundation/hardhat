import { NomicLabsHardhatPluginError } from "hardhat/plugins";

export class LedgerProviderError extends NomicLabsHardhatPluginError {
  constructor(message: string, parent?: Error) {
    super("@nomiclabs/hardhat-ledger", message, parent);
  }
}

export class NotControlledAddressError extends LedgerProviderError {
  public static isNotControlledAddressError(
    other: any
  ): other is NotControlledAddressError {
    return (
      other !== undefined &&
      other !== null &&
      other._isNotControlledAddressError === true
    );
  }

  private readonly _isNotControlledAddressError = true;

  constructor(message: string, public address: string) {
    super(message);
  }
}

export class ConnectionError extends LedgerProviderError {
  public static isConnectionError(other: any): other is ConnectionError {
    return (
      other !== undefined && other !== null && other._isConnectionError === true
    );
  }

  private readonly _isConnectionError = true;
}

export class DerivationPathError extends LedgerProviderError {
  public static isDerivationPathError(
    other: any
  ): other is DerivationPathError {
    return (
      other !== undefined &&
      other !== null &&
      other._isDerivationPathError === true
    );
  }

  private readonly _isDerivationPathError = true;

  constructor(message: string, public path: string) {
    super(message);
  }
}
