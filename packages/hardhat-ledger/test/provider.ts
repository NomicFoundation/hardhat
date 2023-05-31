import { assert, expect } from "chai";
import sinon from "sinon";

import Eth from "@ledgerhq/hw-app-eth";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import Transport from "@ledgerhq/hw-transport";
import { EIP712Message } from "@ledgerhq/hw-app-eth/lib/modules/EIP712";
import { TransportError } from "@ledgerhq/errors";

import { LedgerProvider } from "../src/provider";
import { EthereumMockedProvider } from "./mocks";
import { LedgerOptions } from "../src/types";

import { NomicLabsHardhatPluginError } from "hardhat/src/internal/core/errors";
import { ERRORS } from "hardhat/src/internal/core/errors-list";

describe("LedgerProvider", () => {
  let path: string;
  let mock: EthereumMockedProvider;
  let provider: LedgerProvider;

  function stubTransport(transport: Transport) {
    return sinon
      .stub(TransportNodeHid, "create")
      .returns(Promise.resolve(transport));
  }

  beforeEach(() => {
    path = "44'/60'/0'/0";
    mock = new EthereumMockedProvider();

    provider = new LedgerProvider({ path }, mock);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("eth getter", () => {
    it("should throw a hardhat error if init hasn't been called", () => {
      assert.Throw(
        () => provider.eth,
        ERRORS.GENERAL.UNINITIALIZED_PROVIDER.message
      );
    });
  });

  describe("create", () => {
    beforeEach(() => {
      stubTransport(new Transport());
    });

    it("should return a provider instance", async () => {
      const newProvider = await LedgerProvider.create({ path }, mock);
      assert.instanceOf(newProvider, LedgerProvider);
    });

    it("should init the provider", async () => {
      const spy = sinon.spy(LedgerProvider.prototype, "init");
      await LedgerProvider.create({ path }, mock);
      assert.isTrue(spy.calledOnce);
    });
  });

  describe("init", () => {
    let transport: Transport;
    let createStub: sinon.SinonStub;

    beforeEach(() => {
      transport = new Transport();
      createStub = stubTransport(transport);
    });

    it("should call the create method on TransportNodeHid", async () => {
      await provider.init();

      assert.isTrue(
        createStub.calledOnceWith(
          LedgerProvider.DEFAULT_TIMEOUT,
          LedgerProvider.DEFAULT_TIMEOUT
        )
      );
    });

    it("should only init once on multiple calls", async () => {
      await provider.init();
      await provider.init();
      await provider.init();

      assert.isTrue(
        createStub.calledOnceWith(
          LedgerProvider.DEFAULT_TIMEOUT,
          LedgerProvider.DEFAULT_TIMEOUT
        )
      );
    });

    it("should pass the timeout options to the Transport creation", async () => {
      const options: LedgerOptions = {
        path,
        openTimeout: 1000,
        connectionTimeout: 5432,
      };
      const newProvider = new LedgerProvider(options, mock);
      await newProvider.init();

      assert.isTrue(
        createStub.calledOnceWith(
          options.openTimeout,
          options.connectionTimeout
        )
      );
    });

    it("should create an eth instance", async () => {
      await provider.init();
      assert.instanceOf(provider.eth, Eth);
      assert.equal(provider.eth.transport, transport);
    });

    it("should throw a nomic labs hardhat error if create does", async () => {
      const error = new Error("Test Error");
      createStub.throws(error);

      try {
        await provider.init();
      } catch (error) {
        assert.instanceOf(error, NomicLabsHardhatPluginError);
        assert.equal(
          (error as Error).message,
          'There was an error trying to stablish a connection to the Ledger wallet: "Test Error".'
        );
      }
    });

    it("should throw an error with the proper explanation if a transport error is thrown", async () => {
      const error = new TransportError("Transport Error", "Transport Error Id");
      createStub.throws(error);

      try {
        await provider.init();
      } catch (error) {
        assert.instanceOf(error, NomicLabsHardhatPluginError);
        assert.equal(
          (error as Error).message,
          'There was an error trying to stablish a connection to the Ledger wallet: "Transport Error". The error id was: Transport Error Id'
        );
      }
    });
  });

  describe("request", () => {
    let account: { address: string; publicKey: string };
    let rsv: { v: number; r: string; s: string };
    let signature: string;
    let dataToSign: string;
    let typedMessage: EIP712Message;

    beforeEach(async () => {
      stubTransport(new Transport());
      await provider.init();
      account = {
        address: "0x9f649FE750340A295dDdbBd7e1EC8f378cF24b43",
        publicKey: "0x5",
      };

      rsv = {
        v: 55,
        r: "4f4c17305743700648bc4f6cd3038ec6f6af0df73e31757007b7f59df7bee88d",
        s: "7e1941b264348e80c78c4027afc65a87b0a5e43e86742b8ca0823584c6788fd0",
      };
      signature =
        "0x4f4c17305743700648bc4f6cd3038ec6f6af0df73e31757007b7f59df7bee88d7e1941b264348e80c78c4027afc65a87b0a5e43e86742b8ca0823584c6788fd01c";
      dataToSign =
        "0x5417aa2a18a44da0675524453ff108c545382f0d7e26605c56bba47c21b5e979";

      typedMessage = {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
          ],
        },
        primaryType: "Mail",
        domain: {
          name: "Ether Mail",
          version: "1",
          chainId: 1,
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
        },
        message: {
          from: {
            name: "Cow",
            wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
          },
          to: {
            name: "Bob",
            wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
          },
          contents: "Hello, Bob!",
        },
      };
    });

    it("should call the ledger's getAddress method when the JSONRPC eth_accounts method is called", async () => {
      const stub = sinon
        .stub(provider.eth, "getAddress")
        .returns(Promise.resolve(account));

      const resultAccounts = await provider.request({ method: "eth_accounts" });

      assert.isTrue(stub.calledWithExactly(path));
      assert.deepEqual([account.address], resultAccounts);
    });
    it("should call the ledger's getAddress method when the JSONRPC eth_requestAccounts method is called", async () => {
      const stub = sinon
        .stub(provider.eth, "getAddress")
        .returns(Promise.resolve(account));

      const resultAccounts = await provider.request({
        method: "eth_requestAccounts",
      });

      assert.isTrue(stub.calledWithExactly(path));
      assert.deepEqual([account.address], resultAccounts);
    });

    it("should call the ledger's signPersonalMessage method when the JSONRPC personal_sign method is called", async () => {
      const stub = sinon
        .stub(provider.eth, "signPersonalMessage")
        .returns(Promise.resolve(rsv));

      const resultSignature = await provider.request({
        method: "personal_sign",
        params: [dataToSign, account.address],
      });

      assert.isTrue(stub.calledWithExactly(path, dataToSign.slice(2))); // slices 0x
      assert.deepEqual(signature, resultSignature);
    });
    it("should call the ledger's signPersonalMessage method when the JSONRPC eth_sign method is called", async () => {
      const stub = sinon
        .stub(provider.eth, "signPersonalMessage")
        .returns(Promise.resolve(rsv));

      const resultSignature = await provider.request({
        method: "eth_sign",
        params: [account.address, dataToSign],
      });

      assert.isTrue(stub.calledWithExactly(path, dataToSign.slice(2))); // slices 0x
      assert.deepEqual(signature, resultSignature);
    });

    it("should call the ledger's signEIP712Message method when the JSONRPC eth_signTypedData_v4 method is called", async () => {
      const stub = sinon
        .stub(provider.eth, "signEIP712Message")
        .returns(Promise.resolve(rsv));

      sinon.stub(provider.eth, "getAddress").returns(Promise.resolve(account)); // make it a controlled address

      const resultSignature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [account.address, typedMessage],
      });

      assert.isTrue(stub.calledWithExactly(path, typedMessage));
      assert.deepEqual(signature, resultSignature);
    });
    it("should call the ledger's signEIP712HashedMessage method when the JSONRPC eth_signTypedData_v4 method is called", async () => {
      sinon
        .stub(provider.eth, "signEIP712Message")
        .throws("Unsupported Ledger");

      const stub = sinon
        .stub(provider.eth, "signEIP712HashedMessage")
        .returns(Promise.resolve(rsv));

      sinon.stub(provider.eth, "getAddress").returns(Promise.resolve(account)); // make it a controlled address

      const resultSignature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [account.address, typedMessage],
      });

      assert.isTrue(
        stub.calledWithExactly(
          path,
          "0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f", // hash domain
          "0xc52c0ee5d84264471806290a3f2c4cecfc5490626bf912d01f240d7a274b371e" // hash struct
        )
      );
      assert.deepEqual(signature, resultSignature);
    });

    it(
      "should call the ledger's signTransaction method when the JSONRPC eth_sendTransaction method is called"
    );
  });
});
