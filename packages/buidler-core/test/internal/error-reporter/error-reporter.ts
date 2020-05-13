/* tslint:disable:no-unused-expression */ // this is to remove errors using 'expect(obj).to.be.something' assertions
import * as Sentry from "@sentry/node";
import { expect } from "chai";
import sinon from "sinon";

import { BuidlerError } from "../../../src/internal/core/errors";
import { ERRORS } from "../../../src/internal/core/errors-list";
import {
  contextualizeError,
  ErrorContextData,
  ErrorReporter,
  ProxiedErrorReporter,
} from "../../../src/internal/error-reporter/error-reporter";
import * as analyticsUtils from "../../../src/internal/util/analytics";
import * as ciDetection from "../../../src/internal/util/ci-detection";

function mockDependencies() {
  const originalSentryDsn = process.env.SENTRY_DSN;
  process.env.SENTRY_DSN = "";
  // mock Sentry.init() call with empty dsn param, to prevent actual Sentry calls from tests
  const sentryStub = sinon.stub(Sentry, "init").callsFake(function () {
    const dsn = "";
    (Sentry.init as any).wrappedMethod({ dsn });
  });

  // mock isLocalDev() to return false, to ensure errorReporter instance gets enabled for tests
  const isLocalDev = sinon.stub(analyticsUtils, "isLocalDev").returns(false);

  // mock isRunningOnCiServer to false, for CI tests.
  // Note that there should still not be side effects as SentryClient was also stubbed/disabled
  const isRunningOnCiServerStub = sinon
    .stub(ciDetection, "isRunningOnCiServer")
    .returns(false);

  return () => {
    isRunningOnCiServerStub.restore();
    sentryStub.restore();
    isLocalDev.restore();
    process.env.SENTRY_DSN = originalSentryDsn;
  };
}

function emulateCLIteardown() {
  // tslint:disable-next-line:no-string-literal
  delete ErrorReporter["_instance"]; // explicitly delete '_instance' private prop to emulate clean state
}

describe("ErrorReporter", () => {
  let mocksRestore: () => void;

  beforeEach(async () => {
    mocksRestore = mockDependencies();
  });

  afterEach(() => {
    emulateCLIteardown();
    mocksRestore();
  });

  context("ErrorReporter instance", function () {
    it("is disabled by default", function () {
      // fresh state
      const errorReporter = ErrorReporter.getInstance();

      const isEnabled = ErrorReporter.isEnabled(errorReporter);
      expect(isEnabled).to.be.false;
    });

    it("is enabled after CLI setup", async function () {
      // setup error reporter with enabled=true
      await ErrorReporter.setup(__dirname, true, false);
      const errorReporter = ErrorReporter.getInstance();
      const isEnabled = ErrorReporter.isEnabled(errorReporter);
      expect(isEnabled).to.be.true;
    });

    it("is disabled when setup 'enabled' value is false", async function () {
      // setup error reporter with enabled=false
      await ErrorReporter.setup(__dirname, false, false);
      const errorReporter = ErrorReporter.getInstance();

      const isEnabled = ErrorReporter.isEnabled(errorReporter);
      expect(isEnabled).to.be.false;
    });
  });

  it("Sends a message async", async function () {
    await ErrorReporter.setup(__dirname, true, false);
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
    await ErrorReporter.setup(__dirname, true, false);
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

  it("Doesn't report an error that meets filters criteria", async function () {
    await ErrorReporter.setup(__dirname, true, false);
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

    // restore spies
    sentryCaptureException.restore();
  });

  it("Can send an error report when running on background", async function () {
    await ErrorReporter.setup(__dirname, true, true);
    const testError = new Error("test");

    // verify errorReporter instance has been setup in backgronud
    const errorReporter = ErrorReporter.getInstance();
    if (!(errorReporter instanceof ProxiedErrorReporter)) {
      expect.fail(
        errorReporter.constructor.name,
        ProxiedErrorReporter.name,
        "should be instance of ProxiedErrorReporter"
      );
      return;
    }

    // retrieve child process instance
    const childProcess =
      errorReporter[
        // tslint:disable-next-line:no-string-literal
        "_subject"
      ];

    const waitForSuccessResponse = new Promise(
      (resolve: (obj: any) => void, reject: (error?: Error) => void) => {
        childProcess.on("message", (response: any) => {
          if (response.status !== undefined && response.status === "success") {
            resolve(response);
          }
        });

        // set a timeout to reject promise in case something went wrong with the child process
        const timeout = 5000;
        setTimeout(
          () =>
            reject(
              // tslint:disable-next-line only-buidler-error
              new Error(`waitForSuccessResponse timeout after ${timeout}ms`)
            ),
          timeout
        );
      }
    );

    await errorReporter.sendErrorReport(testError);
    const result = await waitForSuccessResponse;

    expect(result).to.exist;
  });
});
