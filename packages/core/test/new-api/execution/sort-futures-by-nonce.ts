import { assert } from "chai";

import { sortFuturesByNonces } from "../../../src/new-api/internal/execution/sort-futures-by-nonces";
import {
  ExecutionStateMap,
  OnchainState,
  OnchainStatuses,
} from "../../../src/new-api/internal/types/execution-state";
import { Future } from "../../../src/new-api/types/module";

describe("execution engine - batch sorting", () => {
  const addr1 = "0x9fD9B0c5A3fA1cE8Fe2f6425d0D93e0e242256bA";
  const addr2 = "0x458aA12c73D5bEbE3dF6e7a86dFd435b94f96dE9";

  it("sort a by accounts/nonce and future id", () => {
    const futures: Future[] = [
      { id: "Contract1" },
      { id: "Contract2" },
      { id: "Contract3" },
      { id: "Contract4" },
      { id: "Contract5" },
      { id: "Contract6" },
      { id: "Contract7" },
    ] as any;

    const exstateMap: ExecutionStateMap = {
      Contract1: {
        onchain: {
          status: OnchainStatuses.EXECUTE,
          currentExecution: null,
          actions: {},
          from: null,
          nonce: null,
        } as OnchainState,
      } as any,
      Contract2: {
        onchain: {
          status: OnchainStatuses.EXECUTE,
          currentExecution: null,
          actions: {},
          from: addr1,
          nonce: 0,
        } as OnchainState,
      } as any,
      Contract3: {
        onchain: {
          status: OnchainStatuses.EXECUTE,
          currentExecution: null,
          actions: {},
          from: addr1,
          nonce: 1,
        } as OnchainState,
      } as any,
      Contract4: {
        onchain: {
          status: OnchainStatuses.EXECUTE,
          currentExecution: null,
          actions: {},
          from: addr1,
          nonce: 2,
        } as OnchainState,
      } as any,
      Contract5: {
        onchain: {
          status: OnchainStatuses.EXECUTE,
          currentExecution: null,
          actions: {},
          from: null,
          nonce: null,
        } as OnchainState,
      } as any,
      Contract6: {
        onchain: {
          status: OnchainStatuses.EXECUTE,
          currentExecution: null,
          actions: {},
          from: addr2,
          nonce: 0,
        } as OnchainState,
      } as any,
      Contract7: {
        onchain: {
          status: OnchainStatuses.EXECUTE,
          currentExecution: null,
          actions: {},
          from: addr2,
          nonce: 1,
        } as OnchainState,
      } as any,
      Contract8: {
        onchain: {
          status: OnchainStatuses.EXECUTE,
          currentExecution: null,
          actions: {},
          from: addr2,
          nonce: 2,
        } as OnchainState,
      } as any,
    };

    const sortedFutures = sortFuturesByNonces(futures, {
      executionStateMap: exstateMap,
    } as any);

    assert.deepStrictEqual(
      sortedFutures.map((f) => f.id),
      [
        "Contract6",
        "Contract7",

        "Contract2",
        "Contract3",
        "Contract4",

        "Contract1",
        "Contract5",
      ]
    );
  });
});
