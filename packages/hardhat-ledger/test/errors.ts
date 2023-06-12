import { assert } from "chai";

import {
  DerivationPathError,
  LedgerProviderError,
  NotControlledAddressError,
} from "../src/errors";

describe("LedgerProviderError", () => {
  it("should set the plugin name of the error", () => {
    const error = new LedgerProviderError("");
    assert.equal(error.pluginName, "@nomiclabs/hardhat-ledger");
  });

  it("should set the message of the error", () => {
    const message = "Some message";
    const error = new LedgerProviderError(message);
    assert.equal(error.message, message);
  });
});

describe("NotControlledAddressError", () => {
  it("should set the message of the error", () => {
    const message = "Look, a message";
    const error = new NotControlledAddressError(message, "");
    assert.equal(error.message, message);
  });

  it("should store the address", () => {
    const address = "0x3d6e2674e40ea221b4a48663d28eff77af564a50";
    const error = new NotControlledAddressError("", address);
    assert.equal(error.address, address);
  });
});

describe("DerivationPathError", () => {
  it("should set the message of the error", () => {
    const message = "Yet another message";
    const error = new DerivationPathError(message, "");
    assert.equal(error.message, message);
  });

  it("should store the path", () => {
    const path = "44'/60'/0'/0/0";
    const error = new DerivationPathError("", path);
    assert.equal(error.path, path);
  });
});
