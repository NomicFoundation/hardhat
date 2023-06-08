import { assert } from "chai";
import sinon from "sinon";
import EventEmitter from "events";
import * as spinners from "../../src/internal/with-spinners";

describe("withSpinners", () => {
  let eventEmitter: EventEmitter;

  function containsArray(baseArray: Array<string | symbol>, values: string[]) {
    return values.every((value) => baseArray.includes(value));
  }

  beforeEach(() => {
    eventEmitter = new EventEmitter();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should attach the connection events", () => {
    const emitter = spinners.withSpinners(eventEmitter);
    assert.isTrue(
      containsArray(emitter.eventNames(), [
        "connection_start",
        "connection_success",
        "connection_failure",
      ])
    );
  });

  it("should attach the derivation events", () => {
    const emitter = spinners.withSpinners(eventEmitter);
    assert.isTrue(
      containsArray(emitter.eventNames(), [
        "derivation_start",
        "derivation_success",
        "derivation_failure",
        "derivation_progress",
      ])
    );
  });

  it("should attach the confirmation events", () => {
    const emitter = spinners.withSpinners(eventEmitter);
    assert.isTrue(
      containsArray(emitter.eventNames(), [
        "confirmation_start",
        "confirmation_success",
        "confirmation_failure",
      ])
    );
  });
});
