import type { TransportError } from "@ledgerhq/errors";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";

export class HardhatLedgerError extends NomicLabsHardhatPluginError {
  constructor(message: string, parent?: Error) {
    super("@nomicfoundation/hardhat-ledger", message, parent);
  }
}

export class HardhatLedgerNotControlledAddressError extends HardhatLedgerError {
  public static instanceOf(
    other: any
  ): other is HardhatLedgerNotControlledAddressError {
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

export class HardhatLedgerConnectionError extends HardhatLedgerError {
  public static instanceOf(other: any): other is HardhatLedgerConnectionError {
    return (
      other !== undefined && other !== null && other._isConnectionError === true
    );
  }

  private readonly _isConnectionError = true;

  constructor(error: Error) {
    super(
      `There was an error trying to establish a connection to the Ledger wallet: "${error.message}".

Make sure your Ledger is connected and unlocked, and that the Ethereum app is open.
`,
      error
    );

    if (error.name === "TransportError") {
      const transportError = error as TransportError;
      this.message += `
The error id was: ${transportError.id}
`;
    }
  }
}

export class HardhatLedgerDerivationPathError extends HardhatLedgerError {
  public static instanceOf(
    other: any
  ): other is HardhatLedgerDerivationPathError {
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
