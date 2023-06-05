import { assert } from "chai";
import sinon from "sinon";

import Eth from "@ledgerhq/hw-app-eth";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import Transport from "@ledgerhq/hw-transport";
import { EIP712Message } from "@ledgerhq/hw-app-eth/lib/modules/EIP712";
import { TransportError } from "@ledgerhq/errors";

import { RequestArguments } from "hardhat/types";

import * as ethWrapper from "../src/internal/wrap-transport";
import { LedgerProvider } from "../src/provider";
import { EthereumMockedProvider } from "./mocks";
import { EthWrapper, LedgerOptions } from "../src/types";
import { LedgerProviderError } from "../src/errors";

describe("LedgerProvider", () => {
  let accounts: string[];
  let path: string;
  let mockedProvider: EthereumMockedProvider;
  let ethInstanceStub: sinon.SinonStubbedInstance<EthWrapper>;
  let provider: LedgerProvider;

  function stubTransport(transport: Transport) {
    return sinon
      .stub(TransportNodeHid, "create")
      .returns(Promise.resolve(transport));
  }

  beforeEach(() => {
    accounts = [
      "0xa809931e3b38059adae9bc5455bc567d0509ab92",
      "0xda6a52afdae5ff66aa786da68754a227331f56e3",
      "0xbc307688a80ec5ed0edc1279c44c1b34f7746bda",
    ];
    path = "44'/60'/0'/0'/0";
    mockedProvider = new EthereumMockedProvider();

    ethInstanceStub = sinon.createStubInstance(Eth);

    ethInstanceStub.getAddress.returns(
      Promise.resolve({
        address: accounts[0],
        publicKey: "0x1",
      })
    );

    sinon.stub(ethWrapper, "wrapTransport").returns(ethInstanceStub);

    provider = new LedgerProvider({ accounts }, mockedProvider);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("instance", () => {
    it("should lowercase all accounts", () => {
      const accounts = [
        "0xA809931E3B38059ADAE9BC5455BC567D0509AB92",
        "0xDA6A52AFDAE5FF66AA786DA68754A227331F56E3",
        "0xBC307688A80EC5ED0EDC1279C44C1B34F7746BDA",
      ];
      const provider = new LedgerProvider({ accounts }, mockedProvider);
      const lowercasedAccounts = accounts.map((account) =>
        account.toLowerCase()
      );

      assert.deepEqual(provider.options.accounts, lowercasedAccounts);
    });

    it("should throw if the accounts array is empty", () => {
      assert.Throw(() => {
        new LedgerProvider({ accounts: [] }, mockedProvider);
      }, "You tried to initialize a LedgerProvider without supplying any account to the constructor. The provider cannot make any requests on the ledger behalf without an account.");
    });
  });

  describe("create", () => {
    beforeEach(() => {
      stubTransport(new Transport());
    });

    it("should return a provider instance", async () => {
      const newProvider = await LedgerProvider.create(
        { accounts },
        mockedProvider
      );
      assert.instanceOf(newProvider, LedgerProvider);
    });

    it("should init the provider", async () => {
      const spy = sinon.spy(LedgerProvider.prototype, "init");
      await LedgerProvider.create({ accounts }, mockedProvider);
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

      sinon.assert.calledOnceWithExactly(
        createStub,
        LedgerProvider.DEFAULT_TIMEOUT,
        LedgerProvider.DEFAULT_TIMEOUT
      );
    });

    it("should only init once on multiple calls", async () => {
      await provider.init();
      await provider.init();
      await provider.init();

      sinon.assert.calledOnceWithExactly(
        createStub,
        LedgerProvider.DEFAULT_TIMEOUT,
        LedgerProvider.DEFAULT_TIMEOUT
      );
    });

    it("should pass the timeout options to the Transport creation", async () => {
      const options: LedgerOptions = {
        accounts,
        openTimeout: 1000,
        connectionTimeout: 5432,
      };
      const newProvider = new LedgerProvider(options, mockedProvider);
      await newProvider.init();

      sinon.assert.calledOnceWithExactly(
        createStub,
        options.openTimeout,
        options.connectionTimeout
      );
    });

    it("should create an eth instance", async () => {
      await provider.init();
      assert.instanceOf(provider.eth, Eth);
    });

    it("should throw a ledger provider error if create does", async () => {
      const error = new Error("Test Error");
      createStub.throws(error);

      try {
        await provider.init();
      } catch (error) {
        assert.equal(
          (error as LedgerProviderError).message,
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
        assert.equal(
          (error as LedgerProviderError).message,
          'There was an error trying to stablish a connection to the Ledger wallet: "Transport Error". The error id was: Transport Error Id'
        );
      }
    });

    describe("path derivation", () => {
      let getAddressStub: sinon.SinonStub;
      // let newMockedEthInstance: EthWrapper;

      function replaceGetAddress(desiredPath: string, desiredAddress: string) {
        ethInstanceStub.getAddress.callsFake(async (path: string) => {
          getAddressStub(path);

          return path === desiredPath
            ? { address: desiredAddress, publicKey: "0x1" }
            : { address: "0x3", publicKey: "0x2" };
        });
      }

      beforeEach(() => {
        getAddressStub = sinon.stub();
        // newMockedEthInstance = sinon.createStubInstance(Eth);

        // wrapTransportStub.restore();
        // wrapTransportStub = sinon
        //   .stub(ethWrapper, "wrapTransport")
        //   .returns(newMockedEthInstance);
      });

      it("should derivate the path changing the account until an address from accounts is found", async () => {
        replaceGetAddress("44'/60'/3'/0'/0", accounts[0]);
        await provider.init();

        sinon.assert.callOrder(
          getAddressStub.withArgs("44'/60'/0'/0'/0"),
          getAddressStub.withArgs("44'/60'/1'/0'/0"),
          getAddressStub.withArgs("44'/60'/2'/0'/0"),
          getAddressStub.withArgs("44'/60'/3'/0'/0")
        );
      });

      it("should return the found path once de account matches", async () => {
        const desiredPath = "44'/60'/5'/0'/0";

        replaceGetAddress(desiredPath, accounts[2]);
        await provider.init();

        assert.equal(provider.path, desiredPath);
      });

      it("should throw if no address matches and the max derivation count is reached", async () => {
        replaceGetAddress(
          `44'/60'/${LedgerProvider.MAX_DERIVATION_ACCOUNTS + 1}'/0'/0`,
          accounts[2]
        );

        try {
          await provider.init();
          provider.path;
        } catch (error) {
          assert.equal(
            (error as LedgerProviderError).message,
            `Could not find a valid derivation path for the supplied accounts. We search paths from m/44'/60'/0/0'/0 to m/44'/60'/${LedgerProvider.MAX_DERIVATION_ACCOUNTS}/0'/0`
          );
        }
      });
    });
  });

  describe("request", () => {
    let account: { address: string; publicKey: string };
    let rsv: { v: number; r: string; s: string };
    let txRsv: { v: string; r: string; s: string };
    let signature: string;
    let dataToSign: string;
    let typedMessage: EIP712Message;
    let initSpy: sinon.SinonSpy;

    beforeEach(async () => {
      stubTransport(new Transport());

      initSpy = sinon.spy(provider, "init");

      account = {
        address: accounts[0],
        publicKey: "0x1",
      };

      rsv = {
        v: 55,
        r: "4f4c17305743700648bc4f6cd3038ec6f6af0df73e31757007b7f59df7bee88d",
        s: "7e1941b264348e80c78c4027afc65a87b0a5e43e86742b8ca0823584c6788fd0",
      };
      txRsv = {
        v: "f4f5",
        r: "4ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0",
        s: "3cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069",
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

    it("should return the configured accounts when the JSONRPC eth_accounts method is called", async () => {
      const resultAccounts = await provider.request({ method: "eth_accounts" });
      assert.deepEqual(accounts, resultAccounts);
      sinon.assert.notCalled(initSpy);
    });
    it("should return the configured accounts when the JSONRPC eth_requestAccounts method is called", async () => {
      const resultAccounts = await provider.request({
        method: "eth_requestAccounts",
      });
      assert.deepEqual(accounts, resultAccounts);
      sinon.assert.notCalled(initSpy);
    });

    it("should call the ledger's signPersonalMessage method when the JSONRPC personal_sign method is called", async () => {
      const stub = ethInstanceStub.signPersonalMessage.returns(
        Promise.resolve(rsv)
      );

      const resultSignature = await provider.request({
        method: "personal_sign",
        params: [dataToSign, account.address],
      });

      sinon.assert.calledOnceWithExactly(stub, path, dataToSign.slice(2)); // slices 0x
      assert.deepEqual(signature, resultSignature);
      sinon.assert.calledOnce(initSpy);
    });
    it("should call the ledger's signPersonalMessage method when the JSONRPC eth_sign method is called", async () => {
      const stub = ethInstanceStub.signPersonalMessage.returns(
        Promise.resolve(rsv)
      );

      const resultSignature = await provider.request({
        method: "eth_sign",
        params: [account.address, dataToSign],
      });

      sinon.assert.calledOnceWithExactly(stub, path, dataToSign.slice(2)); // slices 0x
      assert.deepEqual(signature, resultSignature);
      sinon.assert.calledOnce(initSpy);
    });

    it("should call the ledger's signEIP712Message method when the JSONRPC eth_signTypedData_v4 method is called", async () => {
      const stub = ethInstanceStub.signEIP712Message.returns(
        Promise.resolve(rsv)
      );

      const resultSignature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [account.address, typedMessage],
      });

      sinon.assert.calledOnceWithExactly(stub, path, typedMessage);
      assert.deepEqual(signature, resultSignature);
      sinon.assert.calledOnce(initSpy);
    });
    it("should call the ledger's signEIP712HashedMessage method when the JSONRPC eth_signTypedData_v4 method is called", async () => {
      ethInstanceStub.signEIP712Message.throws("Unsupported Ledger");

      const stub = ethInstanceStub.signEIP712HashedMessage.returns(
        Promise.resolve(rsv)
      );

      const resultSignature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [account.address, typedMessage],
      });

      sinon.assert.calledOnceWithExactly(
        stub,
        path,
        "0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f", // hash domain
        "0xc52c0ee5d84264471806290a3f2c4cecfc5490626bf912d01f240d7a274b371e" // hash struct
      );
      assert.deepEqual(signature, resultSignature);
      sinon.assert.calledOnce(initSpy);
    });

    it("should call the ledger's signTransaction method when the JSONRPC eth_sendTransaction method is called", async () => {
      const tx =
        "0xf8626464830f4240949f649fe750340a295dddbbd7e1ec8f378cf24b43648082f4f5a04ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0a03cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069";

      const requestStub = sinon.stub();
      sinon.replace(
        mockedProvider,
        "request",
        async (args: RequestArguments) => {
          requestStub(args);

          switch (args.method) {
            case "eth_chainId":
              return "0x7a69";
            case "eth_getTransactionCount":
              return "0x64";
            case "eth_sendRawTransaction":
              return tx;
          }
        }
      );

      const signTransactionStub = ethInstanceStub.signTransaction.returns(
        Promise.resolve(txRsv)
      );

      const resultTx = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account.address,
            to: accounts[1],
            value: numberToRpcQuantity(100),
            gas: numberToRpcQuantity(1000000),
            gasPrice: numberToRpcQuantity(100),
            gasLimit: numberToRpcQuantity(1000000),
          },
        ],
      });

      sinon.assert.calledOnceWithExactly(
        signTransactionStub,
        path,
        "e26464830f424094da6a52afdae5ff66aa786da68754a227331f56e36480827a698080",
        {
          nfts: [],
          erc20Tokens: [],
          externalPlugin: [],
          plugin: [],
          domains: [],
        }
      );
      sinon.assert.calledWithExactly(requestStub, {
        method: "eth_getTransactionCount",
        params: [account.address, "pending"],
      });
      sinon.assert.calledWithExactly(requestStub, {
        method: "eth_sendRawTransaction",
        params: [
          "0xf8626464830f424094da6a52afdae5ff66aa786da68754a227331f56e3648082f4f5a04ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0a03cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069",
        ],
      });
      assert.equal(tx, resultTx);
      sinon.assert.calledOnce(initSpy);
    });

    function numberToRpcQuantity(n: number | bigint): string {
      return `0x${n.toString(16)}`;
    }
  });
});
