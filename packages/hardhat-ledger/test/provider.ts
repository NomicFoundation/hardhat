import { assert } from "chai";
import sinon from "sinon";

import Eth from "@ledgerhq/hw-app-eth";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import Transport from "@ledgerhq/hw-transport";
import { EIP712Message } from "@ledgerhq/hw-app-eth/lib/modules/EIP712";
import { TransportError } from "@ledgerhq/errors";

import { RequestArguments } from "hardhat/types";

import * as ethWrapper from "../src/internal/wrap-transport";
import * as cache from "../src/internal/cache";
import { LedgerProvider } from "../src/provider";
import { EthWrapper, LedgerOptions } from "../src/types";
import {
  HardhatLedgerConnectionError,
  HardhatLedgerDerivationPathError,
} from "../src/errors";
import { EthereumMockedProvider } from "./mocks";

describe("LedgerProvider", () => {
  let accounts: string[];
  let mockedProvider: EthereumMockedProvider;
  let ethInstanceStub: sinon.SinonStubbedInstance<EthWrapper>;
  let cacheStub: sinon.SinonStubbedInstance<typeof cache>;
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
    mockedProvider = new EthereumMockedProvider();
    ethInstanceStub = sinon.createStubInstance(Eth);
    cacheStub = sinon.stub(cache);

    sinon.stub(ethWrapper, "wrapTransport").returns(ethInstanceStub);
    cacheStub.read.returns(Promise.resolve(undefined));

    provider = new LedgerProvider({ accounts }, mockedProvider);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("instance", () => {
    it("should lowercase all accounts", () => {
      const uppercaseAccounts = [
        "0xA809931E3B38059ADAE9BC5455BC567D0509AB92",
        "0xDA6A52AFDAE5FF66AA786DA68754A227331F56E3",
        "0xBC307688A80EC5ED0EDC1279C44C1B34F7746BDA",
      ];
      const uppercaseProvider = new LedgerProvider(
        { accounts: uppercaseAccounts },
        mockedProvider
      );
      const lowercasedAccounts = uppercaseAccounts.map((account) =>
        account.toLowerCase()
      );

      assert.deepEqual(uppercaseProvider.options.accounts, lowercasedAccounts);
    });

    it("should check for valid ethereum addresses", () => {
      assert.throws(
        () =>
          new LedgerProvider(
            {
              accounts: [
                "0xe149ff2797adc146aa2d68d3df3e819c3c38e762",
                "0x1",
                "0x343fe45cd2d785a5F2e97a00de8436f9c42Ef444",
              ],
            },
            mockedProvider
          ),
        "The following ledger address from the config is invalid: 0x1"
      );
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
      const createError = new Error("Test Error");
      createStub.throws(createError);

      try {
        await provider.init();
      } catch (error) {
        if (!HardhatLedgerConnectionError.instanceOf(error)) {
          assert.fail("Expected a ConnectionError");
        }
        assert.include(
          error.message,
          `There was an error trying to establish a connection to the Ledger wallet: "${createError.message}".`
        );
      }
    });

    it("should throw an error with the proper explanation if a transport error is thrown", async () => {
      const createError = new TransportError(
        "Transport Error",
        "Transport Error Id"
      );
      createStub.throws(createError);

      try {
        await provider.init();
      } catch (error) {
        if (!HardhatLedgerConnectionError.instanceOf(error)) {
          assert.fail("Expected a ConnectionError");
        }
        assert.include(
          error.message,
          `There was an error trying to establish a connection to the Ledger wallet: "${createError.message}".`
        );
        assert.include(error.message, `The error id was: ${createError.id}`);
      }
    });

    it("should start the paths cache with what the cache returns", async () => {
      const newPaths = {
        "0xe149ff2797adc146aa2d68d3df3e819c3c38e762": "m/44'/60'/0'/0/0",
      };
      const oldPaths = { ...provider.paths }; // new object

      cacheStub.read.returns(Promise.resolve(newPaths));
      await provider.init();

      assert.deepEqual(oldPaths, {});
      assert.deepEqual(newPaths, provider.paths);
    });

    describe("events", () => {
      let emitSpy: sinon.SinonSpy;

      beforeEach(() => {
        emitSpy = sinon.spy(provider, "emit");
      });

      it("should emit the connection_start event", async () => {
        await provider.init();
        sinon.assert.calledWithExactly(emitSpy, "connection_start");
      });

      it("should emit the connection_success event if everything goes right", async () => {
        await provider.init();
        sinon.assert.calledWithExactly(emitSpy, "connection_start");
      });

      it("should emit the connection_failure if the connection fails", async () => {
        try {
          createStub.throws(new Error());
          await provider.init();
        } catch (error) {}
        sinon.assert.calledWithExactly(emitSpy, "connection_failure");
      });
    });
  });

  describe("request", () => {
    let path: string;
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

      path = "m/44'/60'/1'/0/0";
      account = {
        address: accounts[1],
        publicKey: "0x1",
      };
      ethInstanceStub.getAddress.callsFake(async (searchedPath: string) =>
        searchedPath === path ? account : { address: "0x0", publicKey: "0x0" }
      );

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

    describe("unsupported methods", () => {
      it("should not init the provider if and unsupported JSONRPC method is called", async () => {
        sinon.stub(mockedProvider, "request");
        await provider.request({ method: "eth_blockNumber" });
        await provider.request({ method: "eth_getBlockByNumber" });
        await provider.request({ method: "net_version" });

        sinon.assert.notCalled(initSpy);
      });

      it("should forward unsupported JSONRPC methods to the wrapped provider", async () => {
        const requestStub = sinon.stub(mockedProvider, "request");

        const blockNumberArgs = {
          method: "eth_blockNumber",
          params: [1, 2, 3],
        };
        await provider.request(blockNumberArgs);

        const netVersionArgs = {
          method: "eth_getBlockByNumber",
          params: ["2.0"],
        };
        await provider.request(netVersionArgs);

        sinon.assert.calledTwice(requestStub);
        sinon.assert.calledWith(requestStub.getCall(0), blockNumberArgs);
        sinon.assert.calledWith(requestStub.getCall(1), netVersionArgs);
      });
    });

    describe("supported (sign) methods", () => {
      it("should forward to the wrapped provider if the address doing the signing is not controlled", async () => {
        const requestStub = sinon.stub(mockedProvider, "request");

        // the address is not on the accounts the providers manage
        const uncontrolledAddress =
          "0x76F8654a8e981A4a5D634c2d3cE56E195a65c319";

        const requestArgs = [
          {
            method: "eth_sign",
            params: [uncontrolledAddress, dataToSign],
          },
          {
            method: "personal_sign",
            params: [dataToSign, uncontrolledAddress],
          },
          {
            method: "eth_signTypedData_v4",
            params: [uncontrolledAddress, typedMessage],
          },
          {
            method: "eth_sendTransaction",
            params: [
              {
                from: uncontrolledAddress,
                to: accounts[1],
                value: "0x100",
                gas: "0x1000000",
                gasPrice: "0x100",
                gasLimit: "0x1000000",
              },
            ],
          },
        ];

        for (const [index, args] of requestArgs.entries()) {
          await provider.request(args);
          sinon.assert.calledWithExactly(requestStub.getCall(index), args);
        }

        sinon.assert.notCalled(initSpy);
      });

      it("should return the configured and base accounts when the JSONRPC eth_accounts method is called", async () => {
        const baseAccounts = [
          "0x18225dbbd263d5a01ac537db4d1eefc12fae8b24",
          "0x704ad3adfa9eae2be46c907ef5325d0fabe17353",
        ];
        sinon.stub(mockedProvider, "request").callsFake(async (args) => {
          if (args.method === "eth_accounts") {
            return baseAccounts;
          }
        });

        const resultAccounts = await provider.request({
          method: "eth_accounts",
        });
        assert.deepEqual([...baseAccounts, ...accounts], resultAccounts);
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
        const numberToRpcQuantity = (n: number | bigint) =>
          `0x${n.toString(16)}`;

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
          "01e1827a696464830f424094da6a52afdae5ff66aa786da68754a227331f56e36480c0",
          {
            nfts: [],
            erc20Tokens: [],
            externalPlugin: [],
            plugin: [],
            domains: [],
          }
        );
        sinon.assert.calledWithExactly(requestStub.getCall(0), {
          method: "eth_getTransactionCount",
          params: [account.address, "pending"],
        });
        sinon.assert.calledWithExactly(requestStub.getCall(1), {
          method: "eth_chainId",
        });
        sinon.assert.calledWithExactly(requestStub.getCall(2), {
          method: "eth_sendRawTransaction",
          params: [
            "0x01f864827a696464830f424094da6a52afdae5ff66aa786da68754a227331f56e36480c080a04ab14d7e96a8bc7390cfffa0260d4b82848428ce7f5b8dd367d13bf31944b6c0a03cc226daa6a2f4e22334c59c2e04ac72672af72907ec9c4a601189858ba60069",
          ],
        });
        assert.equal(tx, resultTx);
        sinon.assert.calledOnce(initSpy);
      });
    });

    describe("path derivation", () => {
      async function requestPersonalSign() {
        ethInstanceStub.signPersonalMessage.returns(Promise.resolve(rsv));
        await provider.request({
          method: "personal_sign",
          params: [dataToSign, account.address],
        });
      }

      it("should cache the derived path from the supplied accounts", async () => {
        await requestPersonalSign();
        await requestPersonalSign();
        await requestPersonalSign();
        await requestPersonalSign();

        sinon.assert.calledTwice(ethInstanceStub.getAddress);
        sinon.assert.calledWith(ethInstanceStub.getAddress, "m/44'/60'/0'/0/0");
        sinon.assert.calledWith(ethInstanceStub.getAddress, "m/44'/60'/1'/0/0");
      });

      it("should cache the path per address on the paths property", async () => {
        await requestPersonalSign();
        await requestPersonalSign();

        assert.deepEqual(provider.paths, { [accounts[1]]: path });
      });

      it("should write the cache with the new paths", async () => {
        await requestPersonalSign();
        await requestPersonalSign();
        await requestPersonalSign();

        sinon.assert.calledOnceWithExactly(cacheStub.write, {
          [accounts[1]]: path,
        });
      });

      it("should not break if caching fails", async () => {
        cacheStub.write.returns(Promise.reject(new Error("Write error")));

        let hasThrown = false;
        try {
          await requestPersonalSign();
        } catch (error) {
          console.log(error);
          hasThrown = true;
        }

        assert.isFalse(hasThrown);
      });

      it("should throw a DerivationPathError if trying to get the address fails", async () => {
        const errorMessage = "Getting the address broke";
        ethInstanceStub.getAddress.throws(new Error(errorMessage));
        try {
          await requestPersonalSign();
        } catch (error) {
          const errorPath = "m/44'/60'/0'/0/0";
          if (!HardhatLedgerDerivationPathError.instanceOf(error)) {
            assert.fail("Expected a DerivationPathError");
          }
          assert.equal(error.path, errorPath);
          assert.equal(
            (error as HardhatLedgerDerivationPathError).message,
            `There was an error trying to derivate path ${errorPath}: "${errorMessage}". The wallet might be connected but locked or in the wrong app.`
          );
        }
      });

      it("should throw a DerivationPathError if the max number of derivations is searched without a result", async () => {
        try {
          ethInstanceStub.getAddress.callsFake(async () => ({
            address: "0x0",
            publicKey: "0x0",
          }));
          await requestPersonalSign();
        } catch (error) {
          const errorPath = `m/44'/60'/${LedgerProvider.MAX_DERIVATION_ACCOUNTS}'/0/0`;
          if (!HardhatLedgerDerivationPathError.instanceOf(error)) {
            assert.fail("Expected a DerivationPathError");
          }
          assert.equal(error.path, errorPath);
          assert.equal(
            (error as HardhatLedgerDerivationPathError).message,
            `Could not find a valid derivation path for ${accounts[1]}. Paths from m/44'/60'/0'/0/0 to ${errorPath} were searched.`
          );
        }
      });
    });

    describe("events", () => {
      let emitSpy: sinon.SinonSpy;

      beforeEach(() => {
        emitSpy = sinon.spy(provider, "emit");
      });

      describe("confirmation", () => {
        it("should emit the confirmation_start event when a request for signing is made", async () => {
          ethInstanceStub.signPersonalMessage.returns(Promise.resolve(rsv));
          await provider.request({
            method: "personal_sign",
            params: [dataToSign, account.address],
          });

          sinon.assert.calledWithExactly(emitSpy, "confirmation_start");
        });

        it("should emit the confirmation_success event when a request for signing goes OK", async () => {
          ethInstanceStub.signPersonalMessage.returns(Promise.resolve(rsv));
          await provider.request({
            method: "eth_sign",
            params: [account.address, dataToSign],
          });

          sinon.assert.calledWithExactly(emitSpy, "confirmation_success");
        });

        it("should emit the confirmation_failure event when a request for signing breaks", async () => {
          ethInstanceStub.signEIP712Message.throws(new Error());
          ethInstanceStub.signEIP712HashedMessage.throws(new Error());
          try {
            await provider.request({
              method: "eth_signTypedData_v4",
              params: [account.address, typedMessage],
            });
          } catch (error) {}

          sinon.assert.calledWithExactly(emitSpy, "confirmation_failure");
        });
      });

      describe("derivation", () => {
        async function requestSign() {
          ethInstanceStub.signPersonalMessage.returns(Promise.resolve(rsv));
          await provider.request({
            method: "eth_sign",
            params: [account.address, dataToSign],
          });
        }

        it("should emit the derivation_start event when a request for signing is made", async () => {
          await requestSign();
          sinon.assert.calledWithExactly(emitSpy, "derivation_start");
        });

        it("should emit the derivation_progress event with the derived paths when a request for signing is made", async () => {
          await requestSign();
          sinon.assert.calledWithExactly(
            emitSpy,
            "derivation_progress",
            "m/44'/60'/0'/0/0",
            0
          );
          sinon.assert.calledWithExactly(
            emitSpy,
            "derivation_progress",
            "m/44'/60'/1'/0/0",
            1
          );
        });

        it("should emit the derivation_success event with the path when a request for signing is made and succeeds", async () => {
          await requestSign();
          sinon.assert.calledWithExactly(
            emitSpy,
            "derivation_success",
            "m/44'/60'/1'/0/0"
          );
        });

        it("should emit the derivation_failure event when a request for signing is made and breaks", async () => {
          try {
            ethInstanceStub.getAddress.throws(new Error());
            await requestSign();
          } catch (error) {}
          sinon.assert.calledWithExactly(emitSpy, "derivation_failure");
        });

        it("should emit the derivation_failure event when a request for signing is made and can't find a valid path", async () => {
          try {
            ethInstanceStub.getAddress.callsFake(async () => ({
              address: "0x0",
              publicKey: "0x0",
            }));
            await requestSign();
          } catch (error) {}
          sinon.assert.calledWithExactly(emitSpy, "derivation_failure");
        });
      });

      describe("eth_accounts", () => {
        beforeEach(() => {
          // eth_accounts will be called to merge the accounts
          sinon.stub(mockedProvider, "request").returns(Promise.resolve([]));
        });

        it("should not emit a connection or derivation event with eth_accounts", async () => {
          await provider.request({ method: "eth_accounts" });
          sinon.assert.notCalled(emitSpy);
        });
      });
    });
  });
});
