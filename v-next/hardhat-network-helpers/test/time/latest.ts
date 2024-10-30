import type { Time } from "../../src/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { initializeNetwork } from "../helpers/helpers.js";

describe("time - latest", () => {
  let time: Time;

  before(async () => {
    const { networkHelpers } = await initializeNetwork();
    time = networkHelpers.time;
  });

  it("should retrieve the timestamp of the latest block", async function () {
    const initialTimestamp = await time.latest();

    await time.increase(1);

    const endTimestamp = await time.latest();

    assert.equal(endTimestamp, initialTimestamp + 1);
  });
});
