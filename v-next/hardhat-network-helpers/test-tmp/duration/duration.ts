// duration.test.js
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Duration } from "../../src/internal/network-helpers/duration/duration.js";

const duration = new Duration();

describe("duration", () => {
  it("should convert years to seconds", () => {
    assert.equal(duration.years(1), 31536000);
  });

  it("should convert weeks to seconds", () => {
    assert.equal(duration.weeks(1), 604800);
  });

  it("should convert days to seconds ", () => {
    assert.equal(duration.days(1), 86400);
  });

  it("should convert hours to seconds", () => {
    assert.equal(duration.hours(1), 3600);
  });

  it("should convert minutes to seconds", () => {
    assert.equal(duration.minutes(1), 60);
  });

  it("should return the same number of seconds", () => {
    assert.equal(duration.seconds(1), 1);
  });

  it("should convert milliseconds to seconds", () => {
    assert.equal(duration.millis(1000), 1);
  });

  it("should convert milliseconds to seconds rounded down to the nearest whole number", () => {
    assert.equal(duration.millis(2200), 2);
  });
});
