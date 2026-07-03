// Unit tests for resolve-regression-trigger.cjs.
//
// Run with Node's built-in test runner (no extra dependencies):
//   node --test .github/scripts/resolve-regression-trigger.test.cjs

const test = require("node:test");
const assert = require("node:assert/strict");

const resolve = require("./resolve-regression-trigger.cjs");

const OWNER = "NomicFoundation";
const REPO = "hardhat";
const FULL = `${OWNER}/${REPO}`;

// Build a mocked { github, context, core } plus a `captured` record of the
// side effects the module produced (outputs, logs, comments, reactions).
function makeDeps({ eventName, sha, payload = {}, ci, pr } = {}) {
  const captured = {
    outputs: {},
    infos: [],
    warnings: [],
    comments: [],
    reactions: [],
  };

  const core = {
    setOutput: (k, v) => {
      captured.outputs[k] = v;
    },
    info: (m) => captured.infos.push(m),
    warning: (m) => captured.warnings.push(m),
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
          if (pr === undefined) throw new Error("pulls.get not expected");
          return { data: pr };
        },
      },
      issues: {
        createComment: async ({ body }) => captured.comments.push(body),
      },
      reactions: {
        createForIssueComment: async ({ content }) =>
          captured.reactions.push(content),
      },
    },
  };

  const context = {
    repo: { owner: OWNER, repo: REPO },
    eventName,
    sha,
    payload,
  };

  return { github, context, core, captured };
}

// A `/bench` comment on a same-repo PR, by an authorized author.
function commentPayload(body, { assoc = "MEMBER", number = 7 } = {}) {
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

test("push → baseline run of HEAD", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "push",
    sha: "deadbeefcafe1234",
  });
  await resolve(deps);
  assert.deepEqual(captured.outputs, {
    should_run: "true",
    hardhat_ref: "deadbeefcafe1234",
    is_baseline: "true",
  });
});

test("workflow_dispatch → runs the dispatched ref, not a baseline", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "workflow_dispatch",
    sha: "abc123",
  });
  await resolve(deps);
  assert.deepEqual(captured.outputs, {
    should_run: "true",
    hardhat_ref: "abc123",
    is_baseline: "false",
  });
});

test("issue_comment → unauthorized author does not run", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload("/bench", { assoc: "NONE" }),
  });
  await resolve(deps);
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
  await resolve(deps);
  assert.equal(captured.outputs.should_run, "false");
  assert.equal(captured.comments.length, 1);
  assert.match(captured.comments[0], /can only run for branches in/);
});

test("issue_comment → same-repo PR with green CI runs the PR head", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload("/bench"),
    pr: { head: { repo: { full_name: FULL }, sha: "1234567890ab" } },
    ci: { id: 1, status: "completed", conclusion: "success" },
  });
  await resolve(deps);
  assert.equal(captured.outputs.should_run, "true");
  assert.equal(captured.outputs.hardhat_ref, "1234567890ab");
  assert.equal(captured.outputs.is_baseline, "false");
  assert.equal(captured.comments.length, 1);
  assert.match(captured.comments[0], /Starting regression benchmark/);
});

test("issue_comment → same-repo PR with failing CI does not run", async () => {
  const { captured, ...deps } = makeDeps({
    eventName: "issue_comment",
    payload: commentPayload("/bench"),
    pr: { head: { repo: { full_name: FULL }, sha: "1234567890ab" } },
    ci: { id: 1, status: "completed", conclusion: "failure" },
  });
  await resolve(deps);
  assert.equal(captured.outputs.should_run, "false");
  assert.equal(captured.comments.length, 1);
  assert.match(captured.comments[0], /hasn't passed yet/);
});
