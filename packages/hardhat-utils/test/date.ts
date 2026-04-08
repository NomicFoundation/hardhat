import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expectTypeOf } from "expect-type";

import { toSeconds, secondsToDate, now } from "../src/date.js";

describe("date", () => {
  describe("toSeconds", () => {
    it("Should convert a string to a Unix timestamp", () => {
      const timestamp = toSeconds("2022-01-01T00:00:00Z");
      expectTypeOf(timestamp).toEqualTypeOf<number>();
      assert.equal(timestamp, 1640995200);
    });

    it("Should convert a number to a Unix timestamp", () => {
      const timestamp = toSeconds(1640995200);
      expectTypeOf(timestamp).toEqualTypeOf<number>();
      assert.equal(timestamp, Math.floor(1640995200 / 1000));
    });

    it("Should convert a Date object to a Unix timestamp", () => {
      const timestamp = toSeconds(new Date("2022-01-01T00:00:00Z"));
      expectTypeOf(timestamp).toEqualTypeOf<number>();
      assert.equal(timestamp, 1640995200);
    });
  });

  describe("secondsToDate", () => {
    it("Should convert a Unix timestamp to a Date object", () => {
      const date = secondsToDate(1640995200);
      expectTypeOf(date).toEqualTypeOf<Date>();
      assert.equal(date.toISOString(), "2022-01-01T00:00:00.000Z");
    });
  });

  describe("now", () => {
    it("Should return the current Unix timestamp", () => {
      const timestamp = now();
      expectTypeOf(timestamp).toEqualTypeOf<number>();
      const currentTimestamp = Math.floor(Date.now() / 1000);
      // Allow a 1-second difference
      assert.ok(
        timestamp >= currentTimestamp - 1 && timestamp <= currentTimestamp + 1,
        "Should be within 1 second of the current timestamp",
      );
    });
  });
});
