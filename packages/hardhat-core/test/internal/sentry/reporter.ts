import { assert } from "chai";

import {
  HardhatError,
  HardhatPluginError,
  NomicLabsHardhatPluginError,
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
  let originalHasTelemetryConsent: any;

  beforeEach(() => {
    originalHasTelemetryConsent = (Reporter as any)._hasTelemetryConsent;
    (Reporter as any)._hasTelemetryConsent = () => true;
  });

  afterEach(() => {
    (Reporter as any)._hasTelemetryConsent = originalHasTelemetryConsent;
  });

  describe("shouldReport", () => {
    it("should report plain errors", () => {
      const result = Reporter.shouldReport(new Error("some message"));

      assert.isTrue(result);
    });

    it("should report HardhatErrors that have the shouldBeReported flag", () => {
      const error = new HardhatError({
        ...mockErrorDescriptor,
        shouldBeReported: true,
      });
      const result = Reporter.shouldReport(error);

      assert.isTrue(result);
    });

    it("should not report HardhatErrors that don't have the shouldBeReported flag", () => {
      const error = new HardhatError({
        ...mockErrorDescriptor,
        shouldBeReported: false,
      });
      const result = Reporter.shouldReport(error);

      assert.isFalse(result);
    });

    it("should not report HardhatPluginErrors", () => {
      const result = Reporter.shouldReport(
        new HardhatPluginError("asd", "asd")
      );

      assert.isFalse(result);
    });

    it("should report NomicLabsHardhatPluginErrors that have the shouldBeReported flag", () => {
      const result = Reporter.shouldReport(
        new NomicLabsHardhatPluginError(
          "asd",
          "asd",
          new Error("some message"),
          true
        )
      );

      assert.isTrue(result);
    });

    it("should not report NomicLabsHardhatPluginErrors that don't have the shouldBeReported flag", () => {
      const result = Reporter.shouldReport(
        new NomicLabsHardhatPluginError(
          "asd",
          "asd",
          new Error("some message"),
          false
        )
      );

      assert.isFalse(result);
    });

    it("should not report if the user hasn't given telemetry consent", () => {
      (Reporter as any)._hasTelemetryConsent = () => false;

      const result = Reporter.shouldReport(new Error("some message"));

      assert.isFalse(result);
    });
  });
});
