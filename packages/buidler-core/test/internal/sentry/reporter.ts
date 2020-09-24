import { assert } from "chai";

import {
  HardhatError,
  BuidlerPluginError,
  NomicLabsBuidlerPluginError,
} from "../../../src/internal/core/errors";
import { ErrorDescriptor } from "../../../src/internal/core/errors-list";
import { Reporter } from "../../../src/internal/sentry/reporter";

const mockErrorDescriptor: ErrorDescriptor = {
  number: 123,
  message: "error message",
  title: "Mock error",
  description: "This is a mock error",
  shouldBeReported: false,
};

describe("Reporter", () => {
  describe("shouldReport", () => {
    it("should report plain errors", () => {
      const result = Reporter.shouldReport(new Error("some message"));

      assert.isTrue(result);
    });

    it("should report BuidlerErrors that have the shouldBeReported flag", () => {
      const error = new HardhatError({
        ...mockErrorDescriptor,
        shouldBeReported: true,
      });
      const result = Reporter.shouldReport(error);

      assert.isTrue(result);
    });

    it("should not report BuidlerErrors that don't have the shouldBeReported flag", () => {
      const error = new HardhatError({
        ...mockErrorDescriptor,
        shouldBeReported: false,
      });
      const result = Reporter.shouldReport(error);

      assert.isFalse(result);
    });

    it("should not report BuidlerPluginErrors", () => {
      const result = Reporter.shouldReport(
        new BuidlerPluginError("asd", "asd")
      );

      assert.isFalse(result);
    });

    it("should report NomicLabsBuidlerPluginErrors that have the shouldBeReported flag", () => {
      const result = Reporter.shouldReport(
        new NomicLabsBuidlerPluginError(
          "asd",
          "asd",
          new Error("some message"),
          true
        )
      );

      assert.isTrue(result);
    });

    it("should not report NomicLabsBuidlerPluginErrors that don't have the shouldBeReported flag", () => {
      const result = Reporter.shouldReport(
        new NomicLabsBuidlerPluginError(
          "asd",
          "asd",
          new Error("some message"),
          false
        )
      );

      assert.isFalse(result);
    });
  });
});
