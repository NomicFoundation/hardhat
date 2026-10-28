/**
 * A module meant to be preloaded with `node --import`, which makes the process
 * fail as soon as anything resolves `tsx`. It's used to test that Hardhat
 * never loads `tsx` when it shouldn't.
 *
 * Use it through `NO_TSX_HOOK_URL`, as importing it registers the hook.
 */

import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "tsx" || specifier.startsWith("tsx/")) {
      assert.fail(
        `tsx was loaded: "${specifier}" was imported from ${context.parentURL}`,
      );
    }

    return nextResolve(specifier, context);
  },
});
