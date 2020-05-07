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
    sentryCaptureException.restore();
  });

  it("Submits an error report (sync) and can send it later (async)", async function () {
    const errorReporter = ErrorReporter.getInstance();

    const sentryCaptureException = sinon.spy(Sentry, "captureException");
    const sentryFlush = sinon.spy(Sentry, "flush");

    const error = new Error("some unexpected failure");

    errorReporter.enqueueErrorReport(error);
    errorReporter.enqueueErrorReport(error);

    // verify send promises have been called, but not resolved
    expect(sentryCaptureException.calledWith(error)).to.be.true;
    expect(sentryCaptureException.calledTwice).to.be.true;
    expect(sentryFlush.calledTwice).to.be.true;

    let resolvedCount = 0;
    sentryFlush.returnValues.forEach((promise) =>
      promise.then(() => resolvedCount++)
    );
    expect(resolvedCount).to.be.equal(0);

    // verify errors still pending (not sent yet)
    const { pendingReports } = errorReporter as ErrorReporter;
    expect(pendingReports).to.be.length(2);

    // send all pending errors
    await errorReporter.sendPendingReports();

    // verify all errors have been sent
    const {
      pendingReports: pendingReportsAfter,
    } = errorReporter as ErrorReporter;
    expect(pendingReportsAfter).to.be.length(0);
    expect(resolvedCount).to.be.equal(2);

    // restore spies
    sentryCaptureException.restore();
    sentryFlush.restore();
  });
});
