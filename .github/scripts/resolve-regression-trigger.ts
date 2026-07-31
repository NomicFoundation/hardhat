// Resolve the ref, authorize, and gate the regression benchmark trigger.
//
// By event:
//   push              -> baseline run of the pushed main HEAD
//   workflow_dispatch -> run of the dispatched ref's HEAD
//   issue_comment     -> a `/bench` comment on a same-repo PR, gated on the
//                        commenter's permissions and CI being green
//
// Loaded by `actions/github-script` in regression-benchmark.yml via
// `require()`; Node's type stripping executes the TypeScript directly, so
// only erasable syntax is used and no dependencies are available (the setup
// job sparse-checkouts .github/scripts without installing packages).

// How long to wait for the CI run to conclude before giving up, and how
// often to re-check while waiting. Tunable independently.
const CI_WAIT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CI_POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

// Default filters when a run doesn't specify them. The resolver always emits a
// concrete value for both (never empty), so the workflow can pass --scenarios /
// --benchmarks unconditionally; `*` matches everything.
//
// Both default to the full suite: a Hardhat change can affect any part of the
// suite. Narrow per run via the workflow inputs / `scenarios=`/`benchmarks=`
// comment args.
const DEFAULT_SCENARIO_FILTER = "*";
const DEFAULT_BENCHMARK_FILTER = "*";

// Minimal structural types for the slice of the `actions/github-script`
// injected globals this module uses.
interface GithubScriptCore {
  setOutput: (name: string, value: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

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

interface GitHub {
  rest: {
    actions: {
      listWorkflowRuns: (params: {
        owner: string;
        repo: string;
        workflow_id: string;
        head_sha: string;
        per_page: number;
      }) => Promise<{ data: { workflow_runs: WorkflowRun[] } }>;
    };
    pulls: {
      get: (params: {
        owner: string;
        repo: string;
        pull_number: number;
      }) => Promise<{ data: PullRequestData }>;
    };
    issues: {
      createComment: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        body: string;
      }) => Promise<unknown>;
    };
    reactions: {
      createForIssueComment: (params: {
        owner: string;
        repo: string;
        comment_id: number;
        content: string;
      }) => Promise<unknown>;
    };
  };
}

interface Context {
  repo: { owner: string; repo: string };
  eventName: string;
  sha: string;
  serverUrl: string;
  runId: number;
  payload: {
    inputs?: Record<string, string | undefined>;
    comment?: {
      author_association: string;
      user: { login: string };
      id: number;
      body: string;
    };
    issue?: { number: number };
  };
}

export async function resolveRegressionTrigger({
  github,
  context,
  core,
}: {
  github: GitHub;
  context: Context;
  core: GithubScriptCore;
}): Promise<void> {
  const { owner, repo } = context.repo;
  const fullName = `${owner}/${repo}`;
  const eventName = context.eventName;
  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;

  let shouldRun = false;
  let benchRef = "";
  let isBaseline = false;
  // Glob(s) selecting which projects / benchmarks to run (forwarded verbatim to
  // bench:regression's --scenarios / --benchmarks). Both default to their
  // DEFAULT_* for every trigger (including the main baseline) and are
  // overridable on dispatch/`/bench`.
  let scenarioFilter = DEFAULT_SCENARIO_FILTER;
  let benchmarkFilter = DEFAULT_BENCHMARK_FILTER;

  // Wait for the CI workflow run for `sha` to conclude. Returns true only
  // if it completed successfully. Polls until CI_WAIT_TIMEOUT_MS elapses.
  async function waitForCi(sha: string): Promise<boolean> {
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
      await new Promise((resolve) => setTimeout(resolve, CI_POLL_INTERVAL_MS));
    }
    core.warning("Timed out waiting for CI to conclude");
    return false;
  }

  // Cosmetic side effects (reactions, status comments) must never fail the job:
  // the gating decision (`should_run`) is the only thing that matters. Run them
  // through this wrapper so any API rejection — insufficient token permissions,
  // rate limits, transient 5xx — degrades to a warning instead of aborting.
  async function bestEffort(
    description: string,
    fn: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await fn();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      core.warning(`${description} failed (ignored): ${message}`);
    }
  }

  async function postComment(body: string): Promise<void> {
    if (eventName !== "issue_comment") {
      return;
    }
    const issueNumber = context.payload.issue?.number;
    if (issueNumber === undefined) {
      return;
    }
    await bestEffort("Posting status comment", () =>
      github.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      }),
    );
  }

  if (eventName === "push") {
    shouldRun = true;
    benchRef = context.sha;
    isBaseline = true;
  } else if (eventName === "workflow_dispatch") {
    shouldRun = true;
    benchRef = context.sha;
    scenarioFilter =
      context.payload.inputs?.["scenario-filter"] || DEFAULT_SCENARIO_FILTER;
    benchmarkFilter =
      context.payload.inputs?.["benchmark-filter"] || DEFAULT_BENCHMARK_FILTER;
    isBaseline = false;
  } else if (eventName === "issue_comment") {
    const comment = context.payload.comment;
    const issue = context.payload.issue;

    if (comment === undefined || issue === undefined) {
      throw new Error(
        "Malformed issue_comment payload: missing comment or issue",
      );
    }

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
        pull_number: issue.number,
      });

      if (pr.head.repo.full_name !== fullName) {
        await postComment(
          "🚫 Regression benchmarks can only run for branches in " +
            "this repository, not forks (the self-hosted runner must " +
            "not execute untrusted code). Push your branch to " +
            `\`${fullName}\` and comment \`/bench\` again.`,
        );
      } else {
        benchRef = pr.head.sha;
        isBaseline = false;

        // Parse `key=value` or `key="value with spaces"` (command/step globs
        // like "cold compile" contain spaces, so quotes are supported).
        const parseParam = (key: string): string => {
          const m = comment.body.match(
            new RegExp(`${key}=(?:"([^"]*)"|(\\S+))`),
          );
          return m?.[1] ?? m?.[2] ?? "";
        };

        scenarioFilter = parseParam("scenarios") || DEFAULT_SCENARIO_FILTER;
        benchmarkFilter = parseParam("benchmarks") || DEFAULT_BENCHMARK_FILTER;

        // Gate on CI being green for the PR head before spending
        // a lot of time on the self-hosted runner.
        const green = await waitForCi(pr.head.sha);
        if (green) {
          shouldRun = true;
          // Only mention a filter that actually narrows the run (`*` = all).
          const filterNotes = [
            scenarioFilter !== "*" && `projects matching \`${scenarioFilter}\``,
            benchmarkFilter !== "*" &&
              `benchmarks matching \`${benchmarkFilter}\``,
          ].filter(Boolean);
          const filterNote =
            filterNotes.length > 0 ? ` (${filterNotes.join(", ")})` : "";
          await postComment(
            `🚀 [Starting regression benchmark](${runUrl}) for ` +
              `\`${benchRef.slice(0, 12)}\`${filterNote}.`,
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
  core.setOutput("bench_ref", benchRef);
  core.setOutput("is_baseline", String(isBaseline));
  core.setOutput("scenario_filter", scenarioFilter);
  core.setOutput("benchmark_filter", benchmarkFilter);
  core.info(
    `should_run=${shouldRun} bench_ref=${benchRef} ` +
      `is_baseline=${isBaseline} scenario_filter=${scenarioFilter} ` +
      `benchmark_filter=${benchmarkFilter}`,
  );
}
