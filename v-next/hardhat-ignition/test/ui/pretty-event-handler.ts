import { assert } from "chai";

import { PrettyEventHandler } from "../../src/ui/pretty-event-handler.js";

describe("ui - pretty event handler", () => {
  describe("ledger", () => {
    it("should set a message on connection start", () => {
      const eventHandler = new PrettyEventHandler(undefined, true);

      eventHandler.ledgerConnectionStart();

      assert.equal(eventHandler.state.ledgerMessage, "Connecting wallet");
      assert.isTrue(eventHandler.state.ledger);
      assert.isTrue(eventHandler.state.ledgerMessageIsDisplayed);
    });

    it("should set a message on connection success", () => {
      const eventHandler = new PrettyEventHandler(undefined, true);

      eventHandler.ledgerConnectionSuccess();

      assert.equal(eventHandler.state.ledgerMessage, "Wallet connected");
    });

    it("should set a message on connection failure", () => {
      const eventHandler = new PrettyEventHandler(undefined, true);

      eventHandler.ledgerConnectionFailure();

      assert.equal(
        eventHandler.state.ledgerMessage,
        "Wallet connection failed",
      );
    });

    it("should set a message on confirmation start", () => {
      const eventHandler = new PrettyEventHandler(undefined, true);

      eventHandler.ledgerConfirmationStart();

      assert.equal(
        eventHandler.state.ledgerMessage,
        "Waiting for confirmation on device",
      );
      assert.isTrue(eventHandler.state.ledger);
      assert.isTrue(eventHandler.state.ledgerMessageIsDisplayed);
    });

    it("should set a message on confirmation success", () => {
      const eventHandler = new PrettyEventHandler(undefined, true);

      eventHandler.ledgerConfirmationSuccess();

      assert.equal(
        eventHandler.state.ledgerMessage,
        "Transaction approved by device",
      );
      assert.isFalse(eventHandler.state.ledger);
    });

    it("should set a message on confirmation failure", () => {
      const eventHandler = new PrettyEventHandler(undefined, true);

      eventHandler.ledgerConfirmationFailure();

      assert.equal(
        eventHandler.state.ledgerMessage,
        "Transaction confirmation failed",
      );
    });
  });
});
