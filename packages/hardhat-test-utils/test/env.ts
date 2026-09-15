import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { createEnvChanges, createTestEnvManager } from "../src/env.js";

// Every variable name used here is prefixed with this, so the tests can't
// collide with each other or with the environment they run in.
const PREFIX = "HARDHAT_TEST_ENV_MANAGER_";

function assertUnset(name: string) {
  assert.ok(!(name in process.env), `${name} should be unset`);
}

describe("env", () => {
  after(() => {
    for (const name of Object.keys(process.env)) {
      if (name.startsWith(PREFIX)) {
        delete process.env[name];
      }
    }
  });

  describe("createEnvChanges", () => {
    it("should set a variable that wasn't set, and unset it on restore", () => {
      const name = `${PREFIX}SET_ABSENT`;
      const changes = createEnvChanges();

      changes.setEnvVar(name, "value");
      assert.equal(process.env[name], "value");

      changes.restoreEnvVars();
      assertUnset(name);
    });

    it("should override a variable that was set, and restore its value", () => {
      const name = `${PREFIX}SET_PRESENT`;
      process.env[name] = "original";
      const changes = createEnvChanges();

      changes.setEnvVar(name, "override");
      assert.equal(process.env[name], "override");

      changes.restoreEnvVars();
      assert.equal(process.env[name], "original");
    });

    it("should restore the first original value when changed repeatedly", () => {
      const name = `${PREFIX}SET_TWICE`;
      process.env[name] = "original";
      const changes = createEnvChanges();

      changes.setEnvVar(name, "first");
      changes.setEnvVar(name, "second");
      assert.equal(process.env[name], "second");

      changes.restoreEnvVars();
      assert.equal(process.env[name], "original");
    });

    it("should unset a variable that was set, and restore its value", () => {
      const name = `${PREFIX}UNSET_PRESENT`;
      process.env[name] = "original";
      const changes = createEnvChanges();

      changes.unsetEnvVar(name);
      assertUnset(name);

      changes.restoreEnvVars();
      assert.equal(process.env[name], "original");
    });

    it("should leave a variable that wasn't set unset", () => {
      const name = `${PREFIX}UNSET_ABSENT`;
      const changes = createEnvChanges();

      changes.unsetEnvVar(name);
      assertUnset(name);

      changes.restoreEnvVars();
      assertUnset(name);
    });

    it("should restore a variable that was unset and then set again", () => {
      const name = `${PREFIX}UNSET_THEN_SET`;
      process.env[name] = "original";
      const changes = createEnvChanges();

      changes.unsetEnvVar(name);
      changes.setEnvVar(name, "back");
      assert.equal(process.env[name], "back");

      changes.restoreEnvVars();
      assert.equal(process.env[name], "original");
    });

    it("should not restore anything twice", () => {
      const name = `${PREFIX}RESTORE_TWICE`;
      process.env[name] = "original";
      const changes = createEnvChanges();

      changes.setEnvVar(name, "override");
      changes.restoreEnvVars();

      // A change made after a restore must survive the next one, i.e. the
      // handle forgot about the value it already put back.
      process.env[name] = "later";
      changes.restoreEnvVars();
      assert.equal(process.env[name], "later");
    });

    it("should restore a variable changed through more than one spelling", () => {
      // On Windows these are the same variable, so tracking them separately
      // would record the second one as originally unset, and the restore would
      // put the original value back and then delete it again. On other
      // platforms they are simply two variables.
      const name = `${PREFIX}CASE`;
      process.env[name] = "original";
      const changes = createEnvChanges();

      changes.unsetEnvVar(name);
      changes.unsetEnvVar(name.toLowerCase());

      changes.restoreEnvVars();
      assert.equal(process.env[name], "original");
    });

    it("should ignore variables changed outside the handle", () => {
      const name = `${PREFIX}UNTRACKED`;
      const changes = createEnvChanges();

      process.env[name] = "raw";
      changes.restoreEnvVars();

      assert.equal(process.env[name], "raw");
    });
  });

  // These two must run as a pair and in this order: the restore happens in the
  // `afterEach` the manager registers, so it can only be observed from a later
  // test. Everything else about the behaviour is covered above, against
  // `createEnvChanges` directly.
  describe("createTestEnvManager", () => {
    const name = `${PREFIX}HOOK`;
    const { setEnvVar } = createTestEnvManager();

    it("should set the variable", () => {
      setEnvVar(name, "value");

      assert.equal(process.env[name], "value");
    });

    it("should have restored it after the previous test", () => {
      assertUnset(name);
    });
  });
});
