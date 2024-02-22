import { assert } from "chai";

import * as hh from "../../../src";

describe("time#duration", function () {
  it("should convert millis to seconds", async function () {
    assert.strictEqual(hh.time.duration.millis(1000), 1);
  });

  it("should convert seconds to seconds (noop)", async function () {
    assert.strictEqual(hh.time.duration.seconds(1000), 1000);
  });

  it("should convert minutes to seconds", async function () {
    assert.strictEqual(hh.time.duration.minutes(1), 60);
  });

  it("should convert hours to seconds", async function () {
    assert.strictEqual(hh.time.duration.hours(1), 3600);
  });

  it("should convert days to seconds", async function () {
    assert.strictEqual(hh.time.duration.days(1), 86400);
  });

  it("should convert weeks to seconds", async function () {
    assert.strictEqual(hh.time.duration.weeks(1), 604800);
  });

  it("should convert years to seconds", async function () {
    assert.strictEqual(hh.time.duration.years(1), 31536000);
  });
});
