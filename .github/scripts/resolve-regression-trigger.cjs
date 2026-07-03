// Resolve refs, authorize, and gate the regression benchmark trigger.
//
// By event:
//   push                -> baseline run of HEAD
//   workflow_dispatch   -> run the dispatched ref
//   issue_comment       -> a `/bench` comment on a same-repo PR, gated on the
//                          commenter's permissions and CI being green

// How long to wait for the CI run to conclude before giving up, and how
// often to re-check while waiting. Tunable independently.
const CI_WAIT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CI_POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const fullName = `${owner}/${repo}`;
  const eventName = context.eventName;
  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;

  let shouldRun = false;
  let hardhatRef = "";
  let isBaseline = false;

  // Wait for the CI workflow run for `sha` to conclude. Returns true only
  // if it completed successfully. Polls until CI_WAIT_TIMEOUT_MS elapses.
  async function waitForCi(sha) {
    const deadline = Date.now() + CI_WAIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const { data } = await github.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: "ci.yml",
        head_sha: sha,
        per_page: 1,
      });
      const run = data.workflow_runs[0];
      if (run !== undefined && run.status === "completed") {
        core.info(`CI run ${run.id} concluded: ${run.conclusion}`);
        return run.conclusion === "success";
      }
      core.info(
        `CI for ${sha.slice(0, 12)} not finished yet ` +
          `(status: ${run?.status ?? "not started"}); waiting...`,
      );
      await new Promise((r) => setTimeout(r, CI_POLL_INTERVAL_MS));
    }
    core.warning("Timed out waiting for CI to conclude");
    return false;
  }

  // Cosmetic side effects (reactions, status comments) must never fail the job:
  // the gating decision (`should_run`) is the only thing that matters. Run them
  // through this wrapper so any API rejection — insufficient token permissions,
  // rate limits, transient 5xx — degrades to a warning instead of aborting.
  async function bestEffort(description, fn) {
    try {
      await fn();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      core.warning(`${description} failed (ignored): ${message}`);
    }
  }

  async function postComment(body) {
    if (eventName !== "issue_comment") return;
    await bestEffort("Posting status comment", () =>
      github.rest.issues.createComment({
        owner,
        repo,
        issue_number: context.payload.issue.number,
        body,
      }),
    );
  }

  if (eventName === "push") {
    shouldRun = true;
    hardhatRef = context.sha;
    isBaseline = true;
  } else if (eventName === "workflow_dispatch") {
    shouldRun = true;
    hardhatRef = context.sha;
    isBaseline = false;
  } else if (eventName === "issue_comment") {
    const comment = context.payload.comment;
    const assoc = comment.author_association;
    const allowed = ["OWNER", "MEMBER", "COLLABORATOR"];

    // Acknowledge the request.
    await bestEffort("Adding reaction", () =>
      github.rest.reactions.createForIssueComment({
        owner,
        repo,
        comment_id: comment.id,
        content: "eyes",
      }),
    );

    if (!allowed.includes(assoc)) {
      core.warning(
        `Comment author ${comment.user.login} (${assoc}) is not ` +
          `authorized to trigger benchmarks.`,
      );
    } else {
      const { data: pr } = await github.rest.pulls.get({
        owner,
        repo,
        pull_number: context.payload.issue.number,
      });

      if (pr.head.repo.full_name !== fullName) {
        await postComment(
          "🚫 Regression benchmarks can only run for branches in " +
            "this repository, not forks (the self-hosted runner must " +
            "not execute untrusted code). Push your branch to " +
            `\`${fullName}\` and comment \`/bench\` again.`,
        );
      } else {
        hardhatRef = pr.head.sha;
        isBaseline = false;

        // Gate on CI being green for the PR head before spending
        // ~3h on the self-hosted runner.
        const green = await waitForCi(pr.head.sha);
        if (green) {
          shouldRun = true;
          await postComment(
            `🚀 [Starting regression benchmark](${runUrl}) for ` +
              `\`${hardhatRef.slice(0, 12)}\`.`,
          );
        } else {
          await postComment(
            "⏳ CI for this commit hasn't passed yet, so the " +
              "regression benchmark was not started. Comment " +
              "`/bench` again once CI is green.",
          );
        }
      }
    }
  }

  core.setOutput("should_run", String(shouldRun));
  core.setOutput("hardhat_ref", hardhatRef);
  core.setOutput("is_baseline", String(isBaseline));
  core.info(
    `should_run=${shouldRun} hardhat_ref=${hardhatRef} ` +
      `is_baseline=${isBaseline}`,
  );
};
