import { assert } from "chai";
import { toBigInt } from "ethers";

import {
  PANIC_CODES,
  panicErrorCodeToReason,
} from "../src/internal/reverted/panic";

describe("panic codes", function () {
  it("all exported panic codes should have a description", async function () {
    for (const [key, code] of Object.entries(PANIC_CODES)) {
      const description = panicErrorCodeToReason(toBigInt(code));
      assert.isDefined(description, `No description for panic code ${key}`);
    }
  });
});
