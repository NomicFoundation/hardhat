import type { UiFuture, UiState } from "../../../src/ui/types.js";

import { assert } from "chai";

import { calculateBatchDisplay } from "../../../src/ui/helpers/calculate-batch-display.js";
import {
  UiFutureStatusType,
  UiStateDeploymentStatus,
} from "../../../src/ui/types.js";

import { testFormat } from "./test-format.js";

const exampleState: UiState = {
  status: UiStateDeploymentStatus.DEPLOYING,
  chainId: 31337,
  moduleName: "ExampleModule",
  deploymentDir: "/users/example",
  batches: [],
  currentBatch: 1,
  result: null,
  warnings: [],
  isResumed: false,
  maxFeeBumps: 0,
  disableFeeBumping: false,
  gasBumps: {},
  strategy: null,
  ledger: false,
  ledgerMessage: "",
  ledgerMessageIsDisplayed: false,
};

describe("ui - calculate batch display", () => {
  it("should render a batch with a single running future", () => {
    const expectedText = testFormat(`
      Batch #1
        Executing ExampleModule#Token...
    `);

    assertBatchText(
      [
        {
          status: {
            type: UiFutureStatusType.UNSTARTED,
          },
          futureId: "ExampleModule#Token",
        },
      ],
      3,
      expectedText,
    );
  });

  it("should render a batch with a single completed future", () => {
    const expectedText = testFormat(`
      Batch #1
        Executed ExampleModule#Token
    `);

    assertBatchText(
      [
        {
          status: {
            type: UiFutureStatusType.SUCCESS,
          },
          futureId: "ExampleModule#Token",
        },
      ],
      3,
      expectedText,
    );
  });

  it("should render a batch with a single failed future", () => {
    const expectedText = testFormat(`
      Batch #1
        Failed ExampleModule#Token
    `);

    assertBatchText(
      [
        {
          status: {
            type: UiFutureStatusType.ERRORED,
            message: "The transaction reverted",
          },
          futureId: "ExampleModule#Token",
        },
      ],
      3,
      expectedText,
    );
  });

  it("should render a batch with a single timed out future", () => {
    const expectedText = testFormat(`
      Batch #1
        Timed out ExampleModule#Token
    `);

    assertBatchText(
      [
        {
          status: {
            type: UiFutureStatusType.TIMEDOUT,
          },
          futureId: "ExampleModule#Token",
        },
      ],
      3,
      expectedText,
    );
  });

  it("should render a batch with a single held future", () => {
    const expectedText = testFormat(`
      Batch #1
        Held ExampleModule#Token
    `);

    assertBatchText(
      [
        {
          status: {
            type: UiFutureStatusType.HELD,
            heldId: 1,
            reason: "Waiting for multisig signoff",
          },
          futureId: "ExampleModule#Token",
        },
      ],
      3,
      expectedText,
    );
  });

  it("should render a complex batch in multiple states", () => {
    const expectedText = testFormat(`
      Batch #1
        Failed ExampleModule#Dex
        Held ExampleModule#ENS
        Timed out ExampleModule#Registry
        Executed ExampleModule#Router
        Executing ExampleModule#Token...
      `);

    assertBatchText(
      [
        {
          status: {
            type: UiFutureStatusType.UNSTARTED,
          },
          futureId: "ExampleModule#Token",
        },
        {
          status: {
            type: UiFutureStatusType.ERRORED,
            message: "The transaction reverted",
          },
          futureId: "ExampleModule#Dex",
        },
        {
          status: {
            type: UiFutureStatusType.SUCCESS,
          },
          futureId: "ExampleModule#Router",
        },
        {
          status: {
            type: UiFutureStatusType.TIMEDOUT,
          },
          futureId: "ExampleModule#Registry",
        },
        {
          status: {
            type: UiFutureStatusType.HELD,
            heldId: 1,
            reason: "Waiting for multisig signoff",
          },
          futureId: "ExampleModule#ENS",
        },
      ],
      7,
      expectedText,
    );
  });

  it("should render a batch when using a ledger device", () => {
    const expectedText = testFormat(`
      Batch #1
        Executing ExampleModule#Token...

        Ledger: Waiting for confirmation on device
    `);

    assertBatchText(
      [
        {
          status: {
            type: UiFutureStatusType.UNSTARTED,
          },
          futureId: "ExampleModule#Token",
        },
      ],
      3,
      expectedText,
      {
        ledger: true,
        ledgerMessage: "Waiting for confirmation on device",
      },
    );
  });
});

function assertBatchText(
  batch: UiFuture[],
  expectedHeight: number,
  expectedText: string,
  extraState?: Partial<UiState>,
) {
  const { text: actualText, height } = calculateBatchDisplay({
    ...exampleState,
    batches: [batch],
    ...extraState,
  });

  assert.equal(height, expectedHeight);
  assert.equal(actualText, expectedText);
}
