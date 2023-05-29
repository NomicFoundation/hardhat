import { assert, expect } from "chai";
import sinon from "sinon";

import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import Transport from "@ledgerhq/hw-transport";

import { LedgerProvider } from "../src/provider";
import { EthereumMockedProvider } from "./mocks";

describe("LedgerProvider", () => {
  let path: string;
  let mock: EthereumMockedProvider;
  let provider: LedgerProvider;

  beforeEach(() => {
    path = "44'/60'/0'/0";
    mock = new EthereumMockedProvider();

    provider = new LedgerProvider({ path }, mock);
  });

  describe("create", () => {
    it("should return a provider instance");
    it("should init the provider");
  });

  describe("init", () => {
    it("should call the create method on TransportNodeHid", async () => {
      const transport = new Transport();
      const createStub = sinon
        .stub(TransportNodeHid, "create")
        .returns(Promise.resolve(transport));

      await provider.init();

      assert.isTrue(createStub.calledOnceWith(LedgerProvider.DEFAULT_TIMEOUT));
    });

    it("should only init once on multiple calls");
    it("should pass the timeout options to the Transport creation");
    it("should create an eth instance");

    it("should throw if create does");
    it("should throw a nomic labs error with a transport error");
  });

  describe("request", () => {});
});
