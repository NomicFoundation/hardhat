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
    const ledgerAccounts = [
      "0x704ad3adfa9eae2be46c907ef5325d0fabe17353",
      "0xf4416d306caa15dd4cdf4cd882cd764a6b2aa9b2",
      "0xe149ff2797adc146aa2d68d3df3e819c3c38e762",
      "0x343fe45cd2d785a5f2e97a00de8436f9c42ef444",
    ];
    const ledgerProvider = createLedgerProvider(mockedProvider, {
      ledgerAccounts,
    });

    assert.deepEqual(ledgerProvider.options.accounts, ledgerAccounts);
  });

  it("should pass the provider to the LedgerProvider", async () => {
    const ledgerProvider = createLedgerProvider(mockedProvider, {
      ledgerAccounts: ["0xf4416d306caa15dd4cdf4cd882cd764a6b2aa9b2"],
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
      ledgerAccounts: ["0xe149ff2797adc146aa2d68d3df3e819c3c38e762"],
    });

    sinon.assert.calledOnceWithExactly(withSpinnerSpy, ledgerProvider);
  });
});
