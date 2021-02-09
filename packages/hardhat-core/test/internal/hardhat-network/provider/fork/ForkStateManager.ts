import { assert } from "chai";
import Account from "ethereumjs-account";
import {
  BN,
  bufferToHex,
  keccak256,
  KECCAK256_NULL,
  toBuffer,
  unpad,
} from "ethereumjs-util";
import sinon from "sinon";

import { JsonRpcClient } from "../../../../../src/internal/hardhat-network/jsonrpc/client";
import { ForkStateManager } from "../../../../../src/internal/hardhat-network/provider/fork/ForkStateManager";
import {
  randomAddressBuffer,
  randomHashBuffer,
} from "../../../../../src/internal/hardhat-network/provider/fork/random";
import { makeForkClient } from "../../../../../src/internal/hardhat-network/provider/utils/makeForkClient";
import { ALCHEMY_URL } from "../../../../setup";
import {
  DAI_ADDRESS,
  DAI_TOTAL_SUPPLY_STORAGE_POSITION,
  EMPTY_ACCOUNT_ADDRESS,
  NULL_BYTES_32,
  WETH_ADDRESS,
} from "../../helpers/constants";

describe("ForkStateManager", () => {
  let client: JsonRpcClient;
  let forkBlockNumber: BN;
  let fsm: ForkStateManager;

  before(async function () {
    if (ALCHEMY_URL === undefined || ALCHEMY_URL === "") {
      this.skip();
      return;
    }
  });

  beforeEach(async () => {
    const clientResult = await makeForkClient({ jsonRpcUrl: ALCHEMY_URL! });
    client = clientResult.forkClient;
    forkBlockNumber = clientResult.forkBlockNumber;

    fsm = new ForkStateManager(client, forkBlockNumber);
  });

  it("can be constructed", () => {
    assert.instanceOf(fsm, ForkStateManager);
  });

  describe("copy", () => {
    /* tslint:disable no-string-literal */
    it("creates a new object with the same state", async () => {
      const fsmCopy = fsm.copy();

      assert.equal(fsmCopy["_jsonRpcClient"], fsm["_jsonRpcClient"]);
      assert.isTrue(fsmCopy["_forkBlockNumber"].eq(fsm["_forkBlockNumber"]));
      assert.equal(fsmCopy["_state"], fsm["_state"]);
      assert.equal(fsmCopy["_stateRoot"], fsm["_stateRoot"]);
      assert.equal(fsmCopy["_stateRootToState"], fsm["_stateRootToState"]);
    });
    /* tslint:enable no-string-literal */
  });

  describe("getAccount", () => {
    it("can get account object", async () => {
      const { code } = await client.getAccountData(
        WETH_ADDRESS,
        forkBlockNumber
      );
      const codeHash = keccak256(code);
      const account = await fsm.getAccount(WETH_ADDRESS);

      assert.isTrue(new BN(account.balance).gtn(0));
      assert.isTrue(new BN(account.nonce).eqn(1));
      assert.isTrue(account.codeHash.equals(codeHash));
      assert.isNotTrue(account.stateRoot.equals(Buffer.from([])));
    });

    it("can get non-existent account", async () => {
      const account = await fsm.getAccount(EMPTY_ACCOUNT_ADDRESS);

      assert.isTrue(new BN(account.balance).eqn(0));
      assert.isTrue(new BN(account.nonce).eqn(0));
      assert.isTrue(account.codeHash.equals(KECCAK256_NULL));
      assert.isNotTrue(account.stateRoot.equals(Buffer.from([])));
    });

    it("works with accounts created locally", async () => {
      const address = randomAddressBuffer();
      const code = toBuffer("0xb16b00b1e5");
      const codeHash = keccak256(code);
      await fsm.putContractCode(address, code);
      await fsm.putAccount(
        address,
        new Account({ nonce: new BN(1), balance: new BN(2), codeHash })
      );

      const account = await fsm.getAccount(address);
      assert.isTrue(new BN(account.nonce).eqn(1));
      assert.isTrue(new BN(account.balance).eqn(2));
      assert.isTrue(account.codeHash.equals(codeHash));
      assert.isNotTrue(account.stateRoot.equals(Buffer.from([])));
    });

    it("works with accounts modified locally", async () => {
      const code = toBuffer("0xb16b00b1e5");
      await fsm.putContractCode(WETH_ADDRESS, code);
      const account = await fsm.getAccount(WETH_ADDRESS);

      assert.isTrue(new BN(account.balance).gtn(0));
      assert.isTrue(new BN(account.nonce).eqn(1));
      assert.isTrue(account.codeHash.equals(keccak256(code)));
      assert.isNotTrue(account.stateRoot.equals(Buffer.from([])));
    });
  });

  describe("putAccount", () => {
    it("can create a new account", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(69), balance: new BN(420) });
      await fsm.putAccount(address, toPut);
      const account = await fsm.getAccount(address);

      assert.isTrue(new BN(account.nonce).eqn(69));
      assert.isTrue(new BN(account.balance).eqn(420));
      assert.isTrue(account.codeHash.equals(KECCAK256_NULL));
    });

    it("can change balance and nonce", async () => {
      const account = await fsm.getAccount(WETH_ADDRESS);
      const increasedNonce = new BN(account.nonce).addn(1);
      const increasedBalance = new BN(account.balance).addn(1);
      await fsm.putAccount(
        WETH_ADDRESS,
        new Account({
          nonce: increasedNonce,
          balance: increasedBalance,
          codeHash: account.codeHash,
        })
      );
      const updatedAccount = await fsm.getAccount(WETH_ADDRESS);
      assert.isTrue(new BN(updatedAccount.nonce).eq(increasedNonce));
      assert.isTrue(new BN(updatedAccount.balance).eq(increasedBalance));
      assert.isTrue(updatedAccount.codeHash.equals(account.codeHash));
    });

    it("can change the code stored if the codeHash is the hash of null", async () => {
      const toPut = new Account({ nonce: new BN(69), balance: new BN(420) });
      await fsm.putAccount(WETH_ADDRESS, toPut);

      const wethContract = await fsm.getAccount(WETH_ADDRESS);
      assert.isTrue(wethContract.codeHash.equals(KECCAK256_NULL));
    });
  });

  describe("accountIsEmpty", () => {
    it("returns true for empty accounts", async () => {
      const address = randomAddressBuffer();
      const result = await fsm.accountIsEmpty(address);
      assert.isTrue(result);
    });

    it("returns false for accounts with non-zero nonce", async () => {
      const address = randomAddressBuffer();
      await fsm.putAccount(address, new Account({ nonce: new BN(123) }));
      const result = await fsm.accountIsEmpty(address);
      assert.isFalse(result);
    });

    it("returns false for accounts with non-zero balance", async () => {
      const address = randomAddressBuffer();
      await fsm.putAccount(address, new Account({ balance: new BN(123) }));
      const result = await fsm.accountIsEmpty(address);
      assert.isFalse(result);
    });

    it("returns false for accounts with non-empty code", async () => {
      const address = randomAddressBuffer();
      await fsm.putContractCode(address, toBuffer("0xfafadada"));
      const result = await fsm.accountIsEmpty(address);
      assert.isFalse(result);
    });
  });

  describe("getContractCode", () => {
    it("can get contract code", async () => {
      const { code } = await client.getAccountData(
        DAI_ADDRESS,
        forkBlockNumber
      );
      const fsmCode = await fsm.getContractCode(DAI_ADDRESS);

      assert.isTrue(fsmCode.equals(code));
    });

    it("can get code of an account modified locally", async () => {
      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        toBuffer([69, 4, 20])
      );
      const { code } = await client.getAccountData(
        DAI_ADDRESS,
        forkBlockNumber
      );
      const fsmCode = await fsm.getContractCode(DAI_ADDRESS);

      assert.isTrue(fsmCode.equals(code));
    });
  });

  describe("putContractCode", () => {
    it("can override contract code", async () => {
      const code = toBuffer("0xdeadbeef");

      await fsm.putContractCode(DAI_ADDRESS, code);
      const fsmCode = await fsm.getContractCode(DAI_ADDRESS);

      assert.isTrue(fsmCode.equals(code));
    });

    it("can set code of an existing account", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(69), balance: new BN(420) });
      await fsm.putAccount(address, toPut);

      const code = toBuffer("0xfeedface");
      await fsm.putContractCode(address, code);
      const fsmCode = await fsm.getContractCode(address);
      assert.isTrue(fsmCode.equals(code));
    });
  });

  describe("getContractStorage", () => {
    it("can get contract storage value", async () => {
      const remoteValue = await client.getStorageAt(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        forkBlockNumber
      );

      const fsmValue = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );

      assert.isTrue(fsmValue.equals(unpad(remoteValue)));
    });
  });

  describe("getOriginalContractStorage", () => {
    it("can get contract storage value", async () => {
      const remoteValue = await client.getStorageAt(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        forkBlockNumber
      );
      const fsmValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );

      assert.isTrue(fsmValue.equals(unpad(remoteValue)));
    });

    it("caches original storage value on first call and returns it for subsequent calls", async () => {
      const newValue = toBuffer("0xdeadbeef");
      const originalValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.isNotTrue(originalValue.equals(newValue));

      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        newValue
      );

      const cachedValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.isTrue(cachedValue.equals(originalValue));
    });

    it("retains original storage value after setStateRoot call", async () => {
      const newValue = toBuffer("0xdeadbeef");
      const stateRoot = await fsm.getStateRoot();
      const originalValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        newValue
      );
      await fsm.setStateRoot(stateRoot);
      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        newValue
      );
      const cachedValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.isTrue(cachedValue.equals(originalValue));
    });
  });

  describe("putContractStorage", () => {
    it("can override storage value", async () => {
      const value = toBuffer("0xfeedface");

      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        value
      );
      const fsmValue = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );

      assert.isTrue(fsmValue.equals(value));
    });

    it("can set storage value of an existing account", async () => {
      const address = randomAddressBuffer();
      const toPut = new Account({ nonce: new BN(69), balance: new BN(420) });
      await fsm.putAccount(address, toPut);

      const value = toBuffer("0xfeedface");
      await fsm.putContractStorage(address, toBuffer([1]), value);
      const fsmValue = await fsm.getContractStorage(address, toBuffer([1]));
      assert.isTrue(fsmValue.equals(value));
    });
  });

  /* tslint:disable no-string-literal */
  describe("checkpoint", () => {
    it("stores current state root on the stack", async () => {
      const stateRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      assert.deepEqual(fsm["_stateCheckpoints"], [bufferToHex(stateRoot)]);
    });

    it("allows to checkpoint the same state root twice", async () => {
      const stateRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.checkpoint();
      assert.deepEqual(fsm["_stateCheckpoints"], [
        bufferToHex(stateRoot),
        bufferToHex(stateRoot),
      ]);
    });

    it("allows to checkpoint different state roots", async () => {
      const stateRootOne = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.putContractCode(randomAddressBuffer(), toBuffer("0xdeadbeef"));
      const stateRootTwo = await fsm.getStateRoot();
      await fsm.checkpoint();
      assert.deepEqual(fsm["_stateCheckpoints"], [
        bufferToHex(stateRootOne),
        bufferToHex(stateRootTwo),
      ]);
    });
  });

  describe("commit", () => {
    it("rejects if no checkpoint was made", async () => {
      await assert.isRejected(
        fsm.commit(),
        Error,
        "commit called when not checkpointed"
      );
    });

    it("does not change current state root", async () => {
      await fsm.checkpoint();
      await fsm.putContractCode(randomAddressBuffer(), toBuffer("0xdeadbeef"));
      const beforeRoot = await fsm.getStateRoot();
      await fsm.commit();
      const afterRoot = await fsm.getStateRoot();
      assert.isTrue(afterRoot.equals(beforeRoot));
    });

    it("removes the latest state root from the stack", async () => {
      const stateRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.checkpoint();
      await fsm.commit();
      assert.deepEqual(fsm["_stateCheckpoints"], [bufferToHex(stateRoot)]);
    });
  });

  describe("revert", () => {
    it("rejects if no checkpoint was made", async () => {
      await assert.isRejected(
        fsm.revert(),
        Error,
        "revert called when not checkpointed"
      );
    });

    it("reverts the current state root back to the committed state", async () => {
      const initialRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.putContractCode(randomAddressBuffer(), toBuffer("0xdeadbeef"));
      await fsm.revert();
      const stateRoot = await fsm.getStateRoot();
      assert.isTrue(stateRoot.equals(initialRoot));
    });

    it("does not revert more than one checkpoint back", async () => {
      const address = randomAddressBuffer();
      await fsm.checkpoint();
      await fsm.putContractCode(address, toBuffer("0xdeadbeef"));
      await fsm.checkpoint();
      await fsm.putContractCode(address, toBuffer("0xfeedface"));
      await fsm.revert();
      const code = await fsm.getContractCode(address);
      assert.isTrue(code.equals(toBuffer("0xdeadbeef")));
    });

    it("removes the latest state root from the stack", async () => {
      const stateRoot = await fsm.getStateRoot();
      await fsm.checkpoint();
      await fsm.checkpoint();
      await fsm.revert();
      assert.deepEqual(fsm["_stateCheckpoints"], [bufferToHex(stateRoot)]);
    });
  });
  /* tslint:enable no-string-literal */

  describe("clearContractStorage", () => {
    it("can clear all locally set values", async () => {
      const value = toBuffer("0xfeedface");
      const address = randomAddressBuffer();
      const position = toBuffer([2]);
      await fsm.putContractStorage(address, position, value);
      await fsm.clearContractStorage(address);
      const clearedValue = await fsm.getContractStorage(address, position);
      assert.lengthOf(clearedValue, 0);
    });

    it("can clear all remote values", async () => {
      const value = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.isNotTrue(value.equals(NULL_BYTES_32));
      await fsm.clearContractStorage(DAI_ADDRESS);
      const clearedValue = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.lengthOf(clearedValue, 0);
    });

    it("can clear remote values not previously read", async () => {
      await fsm.clearContractStorage(DAI_ADDRESS);
      const clearedValue = await fsm.getContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.lengthOf(clearedValue, 0);
    });
  });

  describe("getStateRoot", () => {
    it("returns current state root", async () => {
      const root = await fsm.getStateRoot();
      assert.isNotTrue(root.equals(toBuffer([])));
    });

    it("returns the same state root if no storage was modified", async () => {
      const root1 = await fsm.getStateRoot();
      const root2 = await fsm.getStateRoot();
      assert.isTrue(root1.equals(root2));
    });

    it("returns a different state root after storage modification", async () => {
      const root1 = await fsm.getStateRoot();
      await fsm.putContractCode(randomAddressBuffer(), toBuffer("0xdeadbeef"));
      const root2 = await fsm.getStateRoot();
      assert.isNotTrue(root1.equals(root2));
    });
  });

  describe("setStateRoot", () => {
    it("throws an error when an unknown state root is passed", async () => {
      await assert.isRejected(
        fsm.setStateRoot(randomHashBuffer()),
        Error,
        "Unknown state root"
      );
    });

    it("allows to change current state root", async () => {
      const beforeRoot = await fsm.getStateRoot();
      await fsm.putContractCode(randomAddressBuffer(), toBuffer("0xdeadbeef"));
      const afterRoot = await fsm.getStateRoot();
      await fsm.setStateRoot(beforeRoot);
      const restoredRoot = await fsm.getStateRoot();
      assert.isTrue(restoredRoot.equals(beforeRoot));
      assert.isNotTrue(afterRoot.equals(beforeRoot));
    });

    it("allows to change the state", async () => {
      const beforeRoot = await fsm.getStateRoot();
      const address = randomAddressBuffer();
      assert.isTrue((await fsm.getContractCode(address)).equals(toBuffer([])));
      await fsm.putContractCode(address, toBuffer("0xdeadbeef"));
      assert.isTrue(
        (await fsm.getContractCode(address)).equals(toBuffer("0xdeadbeef"))
      );
      await fsm.setStateRoot(beforeRoot);
      assert.isTrue((await fsm.getContractCode(address)).equals(toBuffer([])));
    });
  });

  describe("dumpStorage", () => {
    it("throws not supported error", async () => {
      await assert.isRejected(
        fsm.dumpStorage(randomAddressBuffer()),
        Error,
        "dumpStorage is not supported when forking from remote network"
      );
    });
  });

  describe("hasGenesisState", () => {
    it("throws not supported error", async () => {
      await assert.isRejected(
        fsm.hasGenesisState(),
        Error,
        "hasGenesisState is not supported when forking from remote network"
      );
    });
  });

  describe("generateCanonicalGenesis", () => {
    it("throws not supported error", async () => {
      await assert.isRejected(
        fsm.generateCanonicalGenesis(),
        Error,
        "generateCanonicalGenesis is not supported when forking from remote network"
      );
    });
  });

  describe("generateGenesis", () => {
    it("throws not supported error", async () => {
      await assert.isRejected(
        fsm.generateGenesis(null),
        Error,
        "generateGenesis is not supported when forking from remote network"
      );
    });
  });

  describe("_clearOriginalStorageCache", () => {
    it("makes the subsequent call to getOriginalContractStorage return a fresh value", async () => {
      const newValue = toBuffer("0xdeadbeef");
      const originalValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.isNotTrue(originalValue.equals(newValue));

      await fsm.putContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION,
        newValue
      );
      fsm._clearOriginalStorageCache();

      const freshValue = await fsm.getOriginalContractStorage(
        DAI_ADDRESS,
        DAI_TOTAL_SUPPLY_STORAGE_POSITION
      );
      assert.isTrue(freshValue.equals(newValue));
    });
  });

  describe("touchAccount", () => {
    it("does not throw an error", () => {
      fsm.touchAccount(randomAddressBuffer());
    });
  });

  describe("cleanupTouchedAccounts", () => {
    it("does not throw an error", async () => {
      await fsm.cleanupTouchedAccounts();
    });
  });

  describe("setBlockContext", () => {
    it("throws an error if invoked during checkpoint", async () => {
      await fsm.checkpoint();
      assert.throws(
        () => fsm.setBlockContext(randomHashBuffer(), new BN(0)),
        Error,
        "setBlockContext called when checkpointed"
      );
    });

    describe("when blockNumber is smaller or equal to forkBlockNumber", () => {
      it("clears the state and changes the block context in which methods operate", async () => {
        const oldBlock = forkBlockNumber.subn(10);
        const valueAtOldBlock = await client.getStorageAt(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION,
          oldBlock
        );

        await fsm.putContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION,
          toBuffer("0xdeadbeef")
        );

        fsm.setBlockContext(randomHashBuffer(), oldBlock);
        const fsmValue = await fsm.getContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION
        );
        assert.equal(
          bufferToHex(fsmValue),
          bufferToHex(unpad(valueAtOldBlock))
        );
      });

      it("sets the state root", async () => {
        const newStateRoot = randomHashBuffer();
        fsm.setBlockContext(newStateRoot, forkBlockNumber.subn(10));
        assert.equal(
          bufferToHex(await fsm.getStateRoot()),
          bufferToHex(newStateRoot)
        );
      });
    });

    describe("when blockNumber is greater than forkBlockNumber", () => {
      it("sets the state root", async () => {
        await fsm.putContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION,
          toBuffer("0xdeadbeef")
        );
        const blockOneStateRoot = await fsm.getStateRoot();

        await fsm.putContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION,
          toBuffer("0xfeedface")
        );
        const blockTwoStateRoot = await fsm.getStateRoot();

        fsm.setBlockContext(blockOneStateRoot, forkBlockNumber.addn(1));
        const fsmValue = await fsm.getContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION
        );
        assert.equal(bufferToHex(fsmValue), "0xdeadbeef");
      });
    });
  });

  describe("restoreForkBlockContext", () => {
    it("throws an error if there is uncommitted state", async () => {
      const stateRoot = await fsm.getStateRoot();
      fsm.setBlockContext(randomHashBuffer(), forkBlockNumber.subn(10));
      await fsm.checkpoint();
      assert.throws(
        () => fsm.restoreForkBlockContext(stateRoot),
        Error,
        "restoreForkBlockContext called when checkpointed"
      );
    });

    describe("when the block context has been changed", () => {
      it("restores the fork block context in which methods operate", async () => {
        const valueAtForkBlock = await client.getStorageAt(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION,
          forkBlockNumber
        );
        const getStorageAt = sinon.spy(client, "getStorageAt");

        const stateRoot = await fsm.getStateRoot();
        fsm.setBlockContext(randomHashBuffer(), forkBlockNumber.subn(10));
        fsm.restoreForkBlockContext(stateRoot);
        const fsmValue = await fsm.getContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION
        );

        assert.equal(
          bufferToHex(fsmValue),
          bufferToHex(unpad(valueAtForkBlock))
        );
        assert.isTrue(getStorageAt.calledOnce);
        assert.equal(
          getStorageAt.firstCall.lastArg.toString(),
          forkBlockNumber.toString()
        );

        getStorageAt.restore();
      });

      it("sets the state root", async () => {
        await fsm.putContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION,
          toBuffer("0xdeadbeef")
        );
        const stateRoot = await fsm.getStateRoot();

        fsm.setBlockContext(randomHashBuffer(), forkBlockNumber.subn(10));

        await fsm.putContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION,
          toBuffer("0xfeedface")
        );

        fsm.restoreForkBlockContext(stateRoot);

        const fsmValue = await fsm.getContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION
        );
        assert.equal(bufferToHex(fsmValue), "0xdeadbeef");
      });
    });

    describe("when the block context has not been changed", () => {
      it("sets the state root", async () => {
        await fsm.putContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION,
          toBuffer("0xdeadbeef")
        );
        const blockOneStateRoot = await fsm.getStateRoot();

        await fsm.putContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION,
          toBuffer("0xfeedface")
        );
        const blockTwoStateRoot = await fsm.getStateRoot();

        fsm.setBlockContext(blockOneStateRoot, forkBlockNumber.addn(1));
        fsm.restoreForkBlockContext(blockTwoStateRoot);
        const fsmValue = await fsm.getContractStorage(
          DAI_ADDRESS,
          DAI_TOTAL_SUPPLY_STORAGE_POSITION
        );
        assert.equal(bufferToHex(fsmValue), "0xfeedface");
      });
    });
  });
});
