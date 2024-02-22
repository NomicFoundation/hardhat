import { assert } from "chai";
import Web3 from "web3";

import { promisifyWeb3 } from "../src/pweb3";

const CONTRACT_BYTECODE =
  "6080604052348015600f57600080fd5b50609b8061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c80635a44b650146037578063e730f60b146053575b600080fd5b603d605b565b6040518082815260200191505060405180910390f35b60596064565b005b60006001905090565b56fea265627a7a7230582075918bec172b335d3087851edc0735dd08bf398d38b6680f77bd9d9765d02be464736f6c634300050a0032";

const ABI = [
  {
    constant: true,
    inputs: [],
    name: "constantFunction",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "pure",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "nonConstantFunction",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

describe("pweb3", () => {
  let web3: any;
  let pweb3: any;

  beforeEach("Initialize web3 and pweb3", () => {
    const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
    web3 = new Web3(provider);
    pweb3 = promisifyWeb3(web3);
  });

  it("Should throw if a synch call is made", () => {
    assert.throws(
      () => pweb3.eth.accounts,
      "pweb3 doesn't support synchronous calls."
    );
  });

  it("Should promisify contracts", async () => {
    const accounts = await pweb3.eth.getAccounts();
    const TestContract = pweb3.eth.contract(ABI);

    const test = await TestContract.new({
      data: `0x${CONTRACT_BYTECODE}`,
      from: accounts[0],
      gas: 456789,
    });

    await test.nonConstantFunction({ from: accounts[0] });

    assert.strictEqual(await test.constantFunction(), 1);
  });

  it("Should give the same result as calling web3 but promisified", (done) => {
    web3.eth.getAccounts((error: Error | null, expectedAccounts?: string[]) => {
      const promise = pweb3.eth.getAccounts();
      assert.instanceOf(promise, Promise);
      promise
        .then(
          (actualAccounts: string[]) =>
            assert.deepEqual(actualAccounts, expectedAccounts),
          (_pweb3Error: Error) => assert.instanceOf(error, Error)
        )
        .then(done);
    });
  });
});
