import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { detectAgentEnvironment, isInteractive } from "../src/environment.js";

// Get the original ENV variables and TTY states so they can be restored
// after each test
const ORIGINAL_ENV_VARS = process.env;
const ORIGINAL_STDIN_IS_TTY = process.stdin.isTTY;
const ORIGINAL_STDOUT_IS_TTY = process.stdout.isTTY;

describe("environment", () => {
  describe("detectAgentEnvironment", () => {
    beforeEach(() => {
      process.env = {};
    });

    afterEach(() => {
      // Restore original ENV variables
      process.env = ORIGINAL_ENV_VARS;
    });

    it("should detect no agent when all the ENV variables are undefined", () => {
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: false,
        agents: [],
      });
    });

    it("should detect claude-code via the ENV variable CLAUDECODE", () => {
      process.env.CLAUDECODE = "1";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: true,
        agents: ["claude-code"],
      });
    });

    it("should detect claude-code via the ENV variable CLAUDE_CODE_ENTRYPOINT", () => {
      process.env.CLAUDE_CODE_ENTRYPOINT = "cli";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: true,
        agents: ["claude-code"],
      });
    });

    it("should not duplicate claude-code when both of its ENV variables are set", () => {
      process.env.CLAUDECODE = "1";
      process.env.CLAUDE_CODE_ENTRYPOINT = "cli";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: true,
        agents: ["claude-code"],
      });
    });

    it("should detect codex via the ENV variable CODEX_THREAD_ID", () => {
      process.env.CODEX_THREAD_ID = "019f2222-5970-7771-bbb8-af0972db9601";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: true,
        agents: ["codex"],
      });
    });

    it("should detect codex via the ENV variable CODEX_CI", () => {
      process.env.CODEX_CI = "1";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: true,
        agents: ["codex"],
      });
    });

    it("should detect codex via the ENV variable CODEX_SANDBOX_NETWORK_DISABLED", () => {
      process.env.CODEX_SANDBOX_NETWORK_DISABLED = "1";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: true,
        agents: ["codex"],
      });
    });

    it("should not detect currently unsupported agents (cursor, gemini-cli, amp)", () => {
      process.env.CURSOR_AGENT = "1";
      process.env.CURSOR_TRACE_ID = "abc123";
      process.env.GEMINI_CLI = "1";
      process.env.AGENT = "amp";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: false,
        agents: [],
      });
    });

    it("should report unknown when only the generic ENV variable AI_AGENT is set", () => {
      process.env.AI_AGENT = "somethingnew_1-0-0_agent";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: true,
        agents: ["unknown"],
      });
    });

    it("should ignore the generic ENV variable AI_AGENT when a known agent was already detected", () => {
      process.env.CLAUDECODE = "1";
      process.env.AI_AGENT = "claude-code_2-1-198_agent";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: true,
        agents: ["claude-code"],
      });
    });

    it("should detect multiple agents in nested sessions", () => {
      process.env.CLAUDECODE = "1";
      process.env.CODEX_THREAD_ID = "019f2222-5970-7771-bbb8-af0972db9601";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: true,
        agents: ["claude-code", "codex"],
      });
    });

    it("should not detect an agent in a CI environment without agent ENV variables", () => {
      process.env.CI = "true";
      process.env.GITHUB_ACTIONS = "true";
      assert.deepEqual(detectAgentEnvironment(), {
        isAgent: false,
        agents: [],
      });
    });
  });

  describe("isInteractive", () => {
    beforeEach(() => {
      process.stdin.isTTY = false;
      process.stdout.isTTY = false;
    });

    afterEach(() => {
      // Restore original TTY states
      process.stdin.isTTY = ORIGINAL_STDIN_IS_TTY;
      process.stdout.isTTY = ORIGINAL_STDOUT_IS_TTY;
    });

    it("should be false when neither stdin nor stdout is a TTY", () => {
      assert.equal(isInteractive(), false);
    });

    it("should be true when both stdin and stdout are TTYs", () => {
      process.stdin.isTTY = true;
      process.stdout.isTTY = true;
      assert.equal(isInteractive(), true);
    });

    it("should be false when only stdout is a TTY", () => {
      process.stdout.isTTY = true;
      assert.equal(isInteractive(), false);
    });

    it("should be false when only stdin is a TTY", () => {
      process.stdin.isTTY = true;
      assert.equal(isInteractive(), false);
    });
  });
});
