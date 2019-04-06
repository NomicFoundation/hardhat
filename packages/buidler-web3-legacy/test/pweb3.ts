import { assert } from "chai";
import Web3 from "web3";

import { promisifyWeb3 } from "../src/pweb3";

describe("pweb3", () => {
  let web3: any;
  let pweb3: any;

  beforeEach("Initialize web3 and pweb3", () => {
    const provider = new Web3.providers.HttpProvider("http://localhost:8545");
    web3 = new Web3(provider);
    pweb3 = promisifyWeb3(web3);
  });

  it("Should throw if a synch call is made", () => {
    assert.throws(
      () => pweb3.eth.accounts,
      "pweb3 doesn't support synchronous calls."
    );
  });

  it("Should throw if an unsupported thing is used", () => {
    assert.throws(
      () => pweb3.eth.contract,
      "pweb3.eth.contract is not supported."
    );
  });

  it("Should give the same result as calling web3 but promisified", done => {
    web3.eth.getAccounts((error: Error | null, expectedAccounts?: string[]) => {
      const promise = pweb3.eth.getAccounts();
      assert.instanceOf(promise, Promise);
      promise
        .then(
          (actualAccounts: string[]) =>
            assert.deepEqual(actualAccounts, expectedAccounts),
          (pweb3Error: Error) => assert.instanceOf(error, Error)
        )
        .then(done);
    });
  });
});
