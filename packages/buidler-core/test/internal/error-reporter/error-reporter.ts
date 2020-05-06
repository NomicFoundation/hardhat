import * as Sentry from "@sentry/node";
import { expect } from "chai";
import sinon from "sinon";

import { ErrorReporter } from "../../../src/internal/error-reporter/error-reporter";
import { ErrorReporterClient } from "../../../src/internal/error-reporter/sentry";
import * as analyticsUtils from "../../../src/internal/util/analytics";

describe("ErrorReporter", () => {
  let errorReporterClient: ErrorReporterClient;

  before(async () => {
    // mock Sentry.init() call with empty dsn param, to prevent actual remote calls
    sinon.stub(Sentry, "init").callsFake(function () {
      (Sentry.init as any).wrappedMethod({ dsn: "" });
    });

    // mock isLocalDev() to return false, to ensure errorReporter instance gets enabled
    sinon.stub(analyticsUtils, "isLocalDev").returns(false);

    await ErrorReporter.setup(__dirname, true);
    const errorReporter = ErrorReporter.getInstance();

    expect(errorReporter).to.be.instanceOf(ErrorReporter);
    errorReporterClient = (errorReporter as ErrorReporter).client;
  });

  it("Sends a message async", async function () {
    const errorReporter = ErrorReporter.getInstance();
    const testMessage = "message";
    const testData = { data: 123 };
    const sentryCaptureMessage = sinon.spy(Sentry, "captureMessage");
    const sentryFlush = sinon.spy(Sentry, "flush");

    await errorReporter.sendMessage(testMessage, testData);

    expect(sentryCaptureMessage.calledOnceWith(testMessage)).to.be.true;
    expect(sentryFlush.calledOnce).to.be.true;

    // restore spies
    sentryCaptureMessage.restore();
    sentryFlush.restore();
  });

  it("Sends an error report async", async function () {
    const errorReporter = ErrorReporter.getInstance();

    const sentryCaptureException = sinon.spy(Sentry, "captureException");
    const sentryFlush = sinon.spy(Sentry, "flush");

    const error = new Error("some unexpected failure");
    await errorReporter.sendErrorReport(error);

    expect(sentryCaptureException.calledOnceWith(error)).to.be.true;
    expect(sentryFlush.calledOnce).to.be.true;

    // restore spies
    sentryFlush.restore();
  });
});
