// Unit tests for resolve-regression-trigger.ts.
//
// Run with Node's built-in test runner (no extra dependencies):
//   node --test .github/scripts/resolve-regression-trigger.test.ts

import assert from "node:assert/strict";
import test from "node:test";

import { resolveRegressionTrigger } from "./resolve-regression-trigger.ts";

const OWNER = "NomicFoundation";
const REPO = "hardhat";
const FULL = `${OWNER}/${REPO}`;

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
}

interface PullRequestData {
  head: {
    repo: { full_name: string };
    sha: string;
  };
}

// The record of side effects the module produced (outputs, logs, comments,
// reactions).
interface Captured {
  outputs: Record<string, string>;
  infos: string[];
  warnings: string[];
  comments: string[];
  reactions: string[];
}

// Build a mocked { github, context, core } plus a `captured` record.
function makeDeps({
  eventName,
  sha = "",
  payload = {},
  ci,
  pr,
}: {
  eventName: string;
  sha?: string;
  payload?: object;
  ci?: WorkflowRun;
  pr?: PullRequestData;
}) {
  const captured: Captured = {
    outputs: {},
    infos: [],
    warnings: [],
    comments: [],
    reactions: [],
  };

  const core = {
    setOutput: (name: string, value: string) => {
      captured.outputs[name] = value;
    },
    info: (message: string) => captured.infos.push(message),
    warning: (message: string) => captured.warnings.push(message),
  };

  const github = {
    rest: {
      actions: {
        listWorkflowRuns: async () => ({
          data: { workflow_runs: ci === undefined ? [] : [ci] },
        }),
      },
      pulls: {
        get: async () => {
          if (pr === undefined) {
            throw new Error("pulls.get not expected");
          }
          return { data: pr };
        },
      },
      issues: {
        createComment: async ({ body }: { body: string }) =>
          captured.comments.push(body),
      },
      reactions: {
        createForIssueComment: async ({ content }: { content: string }) =>
          captured.reactions.push(content),
      },
    },
  };

  const context = {
    repo: { owner: OWNER, repo: REPO },
    eventName,
    sha,
    serverUrl: "https://github.com",
    runId: 123,
    payload,
  };

  return { github, context, core, captured };
}

// A `/bench` comment on a same-repo PR, by an authorized author.
function commentPayload(
  body: string,
  { assoc = "MEMBER", number = 7 }: { assoc?: string; number?: number } = {},
) {
  return {
    comment: {
      author_association: assoc,
      user: { login: "dev" },
      id: 99,
      body,
    },
    issue: { number },
  };
}

test("push → baseline run of the pushed HEAD", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "push",
    sha: "deadbeefcafe1234",
  });
  await resolveRegressionTrigger(deps);
  assert.deepEqual(captured.outputs, {
    should_run: "true",
    bench_ref: "deadbeefcafe1234",
    is_baseline: "true",
    // Baselines run the full suite: all projects, all benchmarks.
    scenario_filter: "*",
    benchmark_filter: "*",
  });
});

test("workflow_dispatch → runs HEAD with default filters", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "workflow_dispatch",
    sha: "abc123",
    payload: { inputs: {} },
  });
  await resolveRegressionTrigger(deps);
  assert.deepEqual(captured.outputs, {
    should_run: "true",
    bench_ref: "abc123",
    is_baseline: "false",
    // No filters given → full suite.
    scenario_filter: "*",
    benchmark_filter: "*",
  });
});

test("workflow_dispatch → forwards explicit filters", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "workflow_dispatch",
    sha: "abc123",
    payload: {
      inputs: {
        "scenario-filter": "1inch*",
        "benchmark-filter": "cold compile",
      },
    },
  });
  await resolveRegressionTrigger(deps);
  assert.equal(captured.outputs.scenario_filter, "1inch*");
  assert.equal(captured.outputs.benchmark_filter, "cold compile");
});

test("issue_comment → malformed payload throws", async () => {
  // The workflow-level `if` guarantees comment + issue are present; their
  // absence means the event contract changed, so the resolver fails loudly.
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: {},
  });
  await assert.rejects(
    resolveRegressionTrigger(deps),
    /Malformed issue_comment payload/,
  );
  assert.deepEqual(captured.outputs, {}); // failed before emitting outputs
});

test("issue_comment → unauthorized author does not run", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload("/bench", { assoc: "NONE" }),
  });
  await resolveRegressionTrigger(deps);
  assert.equal(captured.outputs.should_run, "false");
  assert.equal(captured.warnings.length, 1);
  assert.deepEqual(captured.reactions, ["eyes"]); // request acknowledged
  assert.deepEqual(captured.comments, []); // but nothing posted
});

test("issue_comment → fork PR is rejected", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload("/bench"),
    pr: { head: { repo: { full_name: "attacker/hardhat" }, sha: "f0f0f0" } },
  });
  await resolveRegressionTrigger(deps);
  assert.equal(captured.outputs.should_run, "false");
  assert.equal(captured.comments.length, 1);
  assert.match(captured.comments[0], /can only run for branches in/);
});

test("issue_comment → same-repo PR with green CI runs the full suite", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload("/bench"),
    pr: { head: { repo: { full_name: FULL }, sha: "1234567890ab" } },
    ci: { id: 1, status: "completed", conclusion: "success" },
  });
  await resolveRegressionTrigger(deps);
  assert.equal(captured.outputs.should_run, "true");
  assert.equal(captured.outputs.bench_ref, "1234567890ab");
  assert.equal(captured.outputs.is_baseline, "false");
  assert.equal(captured.outputs.scenario_filter, "*"); // no scenarios= → all
  assert.equal(captured.outputs.benchmark_filter, "*"); // no benchmarks= → all
  assert.equal(captured.comments.length, 1);
  assert.match(captured.comments[0], /Starting regression benchmark/);
  // `*` (all) filters are not called out in the status comment.
  assert.doesNotMatch(captured.comments[0], /projects matching/);
  assert.doesNotMatch(captured.comments[0], /benchmarks matching/);
});

test("issue_comment → parses the 1inch* / test solidity example", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload(
      '/bench scenarios=1inch* benchmarks="test solidity"',
    ),
    pr: { head: { repo: { full_name: FULL }, sha: "1234567890ab" } },
    ci: { id: 1, status: "completed", conclusion: "success" },
  });
  await resolveRegressionTrigger(deps);
  assert.equal(captured.outputs.should_run, "true");
  assert.equal(captured.outputs.scenario_filter, "1inch*");
  assert.equal(captured.outputs.benchmark_filter, "test solidity");
  assert.match(captured.comments[0], /projects matching/);
  assert.match(captured.comments[0], /benchmarks matching/);
});

test("issue_comment → parses a quoted benchmarks= glob (spaces + commas preserved)", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload('/bench benchmarks="warm compile,test *"'),
    pr: { head: { repo: { full_name: FULL }, sha: "1234567890ab" } },
    ci: { id: 1, status: "completed", conclusion: "success" },
  });
  await resolveRegressionTrigger(deps);
  assert.equal(captured.outputs.should_run, "true");
  // Quoted values preserve spaces and internal commas.
  assert.equal(captured.outputs.benchmark_filter, "warm compile,test *");
  assert.match(captured.comments[0], /benchmarks matching/);
});

test("issue_comment → parses an unquoted single-token filter", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload("/bench benchmarks=cold-compile"),
    pr: { head: { repo: { full_name: FULL }, sha: "1234567890ab" } },
    ci: { id: 1, status: "completed", conclusion: "success" },
  });
  await resolveRegressionTrigger(deps);
  assert.equal(captured.outputs.benchmark_filter, "cold-compile");
  // No scenarios= given → default `*` (all projects).
  assert.equal(captured.outputs.scenario_filter, "*");
});

test("issue_comment → same-repo PR with failing CI does not run", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload("/bench"),
    pr: { head: { repo: { full_name: FULL }, sha: "1234567890ab" } },
    ci: { id: 1, status: "completed", conclusion: "failure" },
  });
  await resolveRegressionTrigger(deps);
  assert.equal(captured.outputs.should_run, "false");
  assert.equal(captured.comments.length, 1);
  assert.match(captured.comments[0], /hasn't passed yet/);
});
