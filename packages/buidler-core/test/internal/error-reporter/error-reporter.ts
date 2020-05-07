import * as Sentry from "@sentry/node";
import { expect } from "chai";
import sinon from "sinon";

import { BuidlerError } from "../../../src/internal/core/errors";
import { ERRORS } from "../../../src/internal/core/errors-list";
import {
  contextualizeError,
  DisabledErrorReporter,
  ErrorContextData,
  ErrorReporter,
} from "../../../src/internal/error-reporter/error-reporter";
import { ErrorReporterClient } from "../../../src/internal/error-reporter/sentry";
import * as analyticsUtils from "../../../src/internal/util/analytics";

function mockDependencies() {
  // mock Sentry.init() call with empty dsn param, to prevent actual Sentry calls from tests
  sinon.stub(Sentry, "init").callsFake(function () {
    const dsn = "";
    (Sentry.init as any).wrappedMethod({ dsn });
  });

  // mock isLocalDev() to return false, to ensure errorReporter instance gets enabled for tests
  sinon.stub(analyticsUtils, "isLocalDev").returns(false);
}

async function emulateCLIsetup() {
  await ErrorReporter.setup(__dirname, true);
}

function emulateCLIteardown() {
  // tslint:disable-next-line:no-string-literal
  delete ErrorReporter["_instance"]; // explicitly delete '_instance' private prop to emulate clean state
}

describe("ErrorReporter", () => {
  mockDependencies();

  let errorReporterClient: ErrorReporterClient;

  beforeEach(async () => {
    await emulateCLIsetup();
    const errorReporter = ErrorReporter.getInstance();
    if (!(errorReporter instanceof ErrorReporter)) {
      expect(errorReporter.constructor.name).to.be.equal(
        ErrorReporter.name,
        "should be instance of ErrorReporter"
      );
      return;
    }
    errorReporterClient = errorReporter.client;
  });

  afterEach(() => {
    emulateCLIteardown();
  });

  context("ErrorReporter instance", function () {
    it("is disabled by default", function () {
      // emulate fresh state
      emulateCLIteardown();

      const errorReporter = ErrorReporter.getInstance();
      expect(errorReporter).to.be.instanceOf(DisabledErrorReporter);
    });

    it("is enabled after CLI setup", function () {
      const errorReporter = ErrorReporter.getInstance();
      expect(errorReporter).to.be.instanceOf(ErrorReporter);
    });

    it("is disabled when setup 'enabled' value is false", async function () {
      // emulate fresh state
      emulateCLIteardown();

      // setup error reporter with enabled=false
      await ErrorReporter.setup(__dirname, false);

      const errorReporter = ErrorReporter.getInstance();
      expect(errorReporter).to.be.instanceOf(DisabledErrorReporter);
    });
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

  it("Doesn't report an error that meets filters criteria", async function () {
    const errorReporter = ErrorReporter.getInstance();
    const sentryCaptureException = sinon.spy(Sentry, "captureException");

    // build a test error instance
    const testError = new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, {
      contractName: "A.sol",
    });

    // add a filter for testError
    const errorFilterArtifactsNotFound = ({
      name,
      category,
    }: ErrorContextData) =>
      category !== undefined &&
      category.name === "ARTIFACTS" &&
      name === "NOT_FOUND";

    const { errorFilters } = errorReporter as ErrorReporter;
    errorFilters.push(errorFilterArtifactsNotFound);

    // verify that the testError would be filtered
    const isErrorFiltered = errorFilters.some((filter) =>
      filter(contextualizeError(testError), testError)
    );
    expect(isErrorFiltered).to.be.true;

    // attempt to send error report async, and expect to be ignored
    await errorReporter.sendErrorReport(testError);
    expect(sentryCaptureException.notCalled).to.be.true;

    // attempt to send error report sync, and expect to be ignored
    errorReporter.enqueueErrorReport(testError);
    expect((errorReporter as ErrorReporter).pendingReports).to.be.length(0);

    // expect error report is not sent even after sendPendingReports() call
    await errorReporter.sendPendingReports();
    expect(sentryCaptureException.notCalled).to.be.true;

    // restore spies
    sentryCaptureException.restore();
  });
});
