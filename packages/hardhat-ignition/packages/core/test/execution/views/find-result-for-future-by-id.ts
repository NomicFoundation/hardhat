import { assert } from "chai";

import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result";
import { ExecutionSateType } from "../../../src/internal/execution/types/execution-state";
import { findResultForFutureById } from "../../../src/internal/views/find-result-for-future-by-id";

describe("find result by future by", () => {
  const futureId = "MyFuture";
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  it("should resolve to the address of a deployment execution state", () => {
    const deploymentState = {
      executionStates: {
        [futureId]: {
          type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
      },
    } as any;

    const result = findResultForFutureById(deploymentState, futureId);

    assert.equal(result, exampleAddress);
  });

  it("should fail a call execution state as there is no result to read", () => {
    const deploymentState = {
      executionStates: {
        [futureId]: {
          type: ExecutionSateType.CALL_EXECUTION_STATE,
          result: {
            type: ExecutionResultType.SUCCESS,
          },
        },
      },
    } as any;

    assert.throws(() => findResultForFutureById(deploymentState, futureId));
  });

  it("should resolve to the result of a static call", () => {
    const deploymentState = {
      executionStates: {
        [futureId]: {
          type: ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
          result: {
            type: ExecutionResultType.SUCCESS,
            value: 99n,
          },
        },
      },
    } as any;

    const result = findResultForFutureById(deploymentState, futureId);

    assert.deepStrictEqual(result, 99n);
  });

  it("should error on a send data", () => {
    const deploymentState = {
      executionStates: {
        [futureId]: {
          type: ExecutionSateType.SEND_DATA_EXECUTION_STATE,
          result: {
            type: ExecutionResultType.SUCCESS,
          },
        },
      },
    } as any;

    assert.throws(() => findResultForFutureById(deploymentState, futureId));
  });

  it("should resolve to the address of a contract at", () => {
    const deploymentState = {
      executionStates: {
        [futureId]: {
          type: ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
          contractAddress: exampleAddress,
        },
      },
    } as any;

    const result = findResultForFutureById(deploymentState, futureId);

    assert.deepStrictEqual(result, exampleAddress);
  });

  it("should resolve to the result of a read event argument", () => {
    const deploymentState = {
      executionStates: {
        [futureId]: {
          type: ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
          result: "abc",
        },
      },
    } as any;

    const result = findResultForFutureById(deploymentState, futureId);

    assert.deepStrictEqual(result, "abc");
  });
});
