import { assert } from "chai";

import { DerivationPathError, LedgerProviderError } from "../src/errors";

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

describe("DerivationPathError", () => {
  it("should set the message of the error", () => {
    const message = "Yet another message";
    const error = new DerivationPathError(message, "");
    assert.equal(error.message, message);
  });

  it("should store the path", () => {
    const path = "44'/60'/0'/0'/0";
    const error = new DerivationPathError("", path);
    assert.equal(error.path, path);
  });
});
