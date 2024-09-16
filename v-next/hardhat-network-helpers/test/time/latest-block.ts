import type { NetworkHelpers } from "../../src/internal/network-helpers/network-helpers.js";
import type { Time } from "../../src/internal/network-helpers/time.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { initializeNetwork, initializeTime } from "../helpers/helpers.js";

describe("time -latestBlock", () => {
  let time: Time;
  let networkHelpers: NetworkHelpers;

  before(async () => {
    ({ networkHelpers } = await initializeNetwork());
    time = await initializeTime();
  });

  it("should retrieve the height of the latest block", async () => {
    assert.equal(await time.latestBlock(), 0);

    await networkHelpers.mine();

    assert.equal(await time.latestBlock(), 1);
  });
});
