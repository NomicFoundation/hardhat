import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expectTypeOf } from "expect-type";

import { toSeconds, secondsToDate, now } from "../src/date.js";

describe("date", () => {
  describe("toSeconds", () => {
    it("should convert a string to a Unix timestamp", () => {
      const timestamp = toSeconds("2022-01-01T00:00:00Z");
      expectTypeOf(timestamp).toEqualTypeOf<number>();
      assert.strictEqual(timestamp, 1640995200);
    });

    it("should convert a number to a Unix timestamp", () => {
      const timestamp = toSeconds(1640995200);
      expectTypeOf(timestamp).toEqualTypeOf<number>();
      assert.strictEqual(timestamp, Math.floor(1640995200 / 1000));
    });

    it("should convert a Date object to a Unix timestamp", () => {
      const timestamp = toSeconds(new Date("2022-01-01T00:00:00Z"));
      expectTypeOf(timestamp).toEqualTypeOf<number>();
      assert.strictEqual(timestamp, 1640995200);
    });
  });

  describe("secondsToDate", () => {
    it("should convert a Unix timestamp to a Date object", () => {
      const date = secondsToDate(1640995200);
      expectTypeOf(date).toEqualTypeOf<Date>();
      assert.strictEqual(date.toISOString(), "2022-01-01T00:00:00.000Z");
    });
  });

  describe("now", () => {
    it("should return the current Unix timestamp", () => {
      const timestamp = now();
      expectTypeOf(timestamp).toEqualTypeOf<number>();
      const currentTimestamp = Math.floor(Date.now() / 1000);
      // Allow a 1-second difference
      assert.ok(
        timestamp >= currentTimestamp - 1 && timestamp <= currentTimestamp + 1,
      );
    });
  });
});
