import { assert } from "chai";
import sinon from "sinon";

import { EthereumMockedProvider } from "../mocks";
import { createLedgerProvider } from "../../src/internal/create-ledger-provider";
import * as spinners from "../../src/internal/with-spinners";

describe("createLedgerProvider", () => {
  let mockedProvider: EthereumMockedProvider;

  beforeEach(() => {
    mockedProvider = new EthereumMockedProvider();
  });

  it("should pass the ledgerAccounts from the config to the LedgerProvider", () => {
    const ledgerAccounts = ["0x1", "0x13", "0x9", "0x5"];
    const ledgerProvider = createLedgerProvider(mockedProvider, {
      ledgerAccounts,
    });

    assert.deepEqual(ledgerProvider.options.accounts, ledgerAccounts);
  });

  it("should pass the provider to the LedgerProvider", async () => {
    const ledgerProvider = createLedgerProvider(mockedProvider, {
      ledgerAccounts: ["0x1"],
    });
    const requestStub = sinon.stub(mockedProvider, "request");

    await ledgerProvider.request({ method: "eth_blockNumber" });

    sinon.assert.calledOnceWithExactly(requestStub, {
      method: "eth_blockNumber",
    });
  });

  it("should return a new LedgerProvider with spinners handlers attached", () => {
    const withSpinnerSpy = sinon.spy(spinners, "withSpinners");

    const ledgerProvider = createLedgerProvider(mockedProvider, {
      ledgerAccounts: ["0x1"],
    });

    sinon.assert.calledOnceWithExactly(withSpinnerSpy, ledgerProvider);
  });
});
