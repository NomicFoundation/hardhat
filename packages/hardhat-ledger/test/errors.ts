import { assert } from "chai";

import {
  HardhatLedgerConnectionError,
  HardhatLedgerDerivationPathError,
  HardhatLedgerError,
  HardhatLedgerNotControlledAddressError,
} from "../src/errors";

describe("HardhatLedgerError", () => {
  it("should set the plugin name of the error", () => {
    const error = new HardhatLedgerError("");
    assert.equal(error.pluginName, "@nomicfoundation/hardhat-ledger");
  });

  it("should set the message of the error", () => {
    const message = "Some message";
    const error = new HardhatLedgerError(message);
    assert.equal(error.message, message);
  });
});

describe("HardhatLedgerNotControlledAddressError", () => {
  it("should set the message of the error", () => {
    const message = "Look, a message";
    const error = new HardhatLedgerNotControlledAddressError(message, "");
    assert.equal(error.message, message);
  });

  it("should store the address", () => {
    const address = "0x3d6e2674e40ea221b4a48663d28eff77af564a50";
    const error = new HardhatLedgerNotControlledAddressError("", address);
    assert.equal(error.address, address);
  });

  it("should detect a HardhatLedgerNotControlledAddressError", () => {
    assert.isFalse(
      HardhatLedgerNotControlledAddressError.instanceOf(new Error())
    );
    assert.isTrue(
      HardhatLedgerNotControlledAddressError.instanceOf(
        new HardhatLedgerNotControlledAddressError("", "")
      )
    );
  });
});

describe("HardhatLedgerDerivationPathError", () => {
  it("should set the message of the error", () => {
    const message = "Yet another message";
    const error = new HardhatLedgerDerivationPathError(message, "");
    assert.equal(error.message, message);
  });

  it("should store the path", () => {
    const path = "m/44'/60'/0'/0/0";
    const error = new HardhatLedgerDerivationPathError("", path);
    assert.equal(error.path, path);
  });

  it("should detect a HardhatLedgerDerivationPathError", () => {
    assert.isFalse(HardhatLedgerDerivationPathError.instanceOf(new Error()));
    assert.isTrue(
      HardhatLedgerDerivationPathError.instanceOf(
        new HardhatLedgerDerivationPathError("", "")
      )
    );
  });
});

describe("HardhatLedgerConnectionError", () => {
  it("should detect a HardhatLegerConnectionError", () => {
    assert.isFalse(HardhatLedgerConnectionError.instanceOf(new Error()));
    assert.isTrue(
      HardhatLedgerConnectionError.instanceOf(
        new HardhatLedgerConnectionError(new Error(""))
      )
    );
  });
});
