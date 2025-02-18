/* eslint-disable import/no-unused-modules */
import { buildModule } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("events", () => {
  useEphemeralIgnitionProject("minimal");

  it("should be able to use the output of a readEvent in a contract at", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.readEventArgument(
        createCall,
        "Deployed",
        "fooAddress",
      );

      const foo = m.contractAt("Foo", newAddress);

      return { fooFactory, foo };
    });

    const result = await this.ignition.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.read.isDeployed(), true);
    assert.equal(await result.foo.read.x(), 1n);
  });

  it("should be able to use the output of a readEvent in an artifact contract at", async function () {
    const artifact = await this.hre.artifacts.readArtifact("Foo");

    const moduleDefinition = buildModule("FooModule", (m) => {
      const account1 = m.getAccount(1);

      const fooFactory = m.contract("FooFactory", [], { from: account1 });

      const createCall = m.call(fooFactory, "create", []);

      const newAddress = m.readEventArgument(
        createCall,
        "Deployed",
        "fooAddress",
      );

      const foo = m.contractAt("Foo", artifact, newAddress);

      return { fooFactory, foo };
    });

    const result = await this.ignition.deploy(moduleDefinition);

    assert.equal(await result.fooFactory.read.isDeployed(), true);
    assert.equal(await result.foo.read.x(), 1n);
  });

  it("should be able to read an event from a SendDataFuture", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const sendEmitter = m.contract("SendDataEmitter");

      const send = m.send("send_data_event", sendEmitter);

      const output = m.readEventArgument(send, "SendDataEvent", "arg", {
        emitter: sendEmitter,
      });

      m.call(sendEmitter, "validateEmitted", [output]);

      return { sendEmitter };
    });

    const result = await this.ignition.deploy(moduleDefinition);

    assert.equal(await result.sendEmitter.read.wasEmitted(), true);
  });

  it("should be able to use the output of a readEvent with an indexed tuple result", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const tupleContract = m.contract("TupleEmitter");

      const tupleCall = m.call(tupleContract, "emitTuple");

      const arg1 = m.readEventArgument(tupleCall, "TupleEvent", "arg1", {
        id: "arg1",
      });
      const arg2 = m.readEventArgument(tupleCall, "TupleEvent", 1, {
        id: "arg2",
      });

      m.call(tupleContract, "verifyArg1", [arg1], { id: "call1" });
      m.call(tupleContract, "verifyArg2", [arg2], { id: "call2" });

      return { tupleContract };
    });

    const result = await this.ignition.deploy(moduleDefinition);

    assert.equal(await result.tupleContract.read.arg1Captured(), true);
    assert.equal(await result.tupleContract.read.arg2Captured(), true);
  });
});
