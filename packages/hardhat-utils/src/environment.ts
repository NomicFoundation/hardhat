/**
 * The result of detecting whether the current process is running inside an
 * AI coding agent environment.
 */
export interface AgentEnvironment {
  /**
   * True if at least one agent environment was detected.
   */
  isAgent: boolean;

  /**
   * The identifiers of every detected agent, deduplicated.
   *
   * More than one agent can be reported at the same time, as agent sessions
   * can be nested.
   */
  agents: string[];
}

/**
 * Detects whether the current process is running inside an AI coding agent
 * environment, based on the environment variables that those tools set in
 * the shells they spawn.
 *
 * Currently supported: Claude Code and Codex. Other agents that advertise
 * themselves via the generic `AI_AGENT` variable are reported as "unknown".
 *
 * @returns The detected agent environment.
 */
export function detectAgentEnvironment(): AgentEnvironment {
  const env = process.env;

  const detectedAgents: string[] = [];

  // Claude Code sets these in every shell command it runs
  if (
    env.CLAUDECODE !== undefined ||
    env.CLAUDE_CODE_ENTRYPOINT !== undefined
  ) {
    detectedAgents.push("claude-code");
  }

  // Codex sets these in the shells it spawns
  if (
    env.CODEX_THREAD_ID !== undefined ||
    env.CODEX_CI !== undefined ||
    env.CODEX_SANDBOX_NETWORK_DISABLED !== undefined
  ) {
    detectedAgents.push("codex");
  }

  // Generic marker set by some agents alongside their own variables (e.g.
  // Claude Code sets `AI_AGENT=claude-code_<version>_agent`). It is only
  // reported when no known agent matched, to avoid double counting
  if (detectedAgents.length === 0 && env.AI_AGENT !== undefined) {
    detectedAgents.push("unknown");
  }

  return {
    isAgent: detectedAgents.length > 0,
    agents: detectedAgents,
  };
}

/**
 * Checks whether the current process is running interactively, meaning both
 * stdin and stdout are TTYs.
 *
 * This is orthogonal to agent detection, but can be a useful hint of whether
 * the process is running in an automated environment.
 *
 * @returns True if the current process is running interactively.
 */
export function isInteractive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}
