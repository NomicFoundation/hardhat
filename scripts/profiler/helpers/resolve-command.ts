import type { ScenarioDefinition } from "../../end-to-end/types.ts";

export interface ResolvedCommand {
  /** The shell command to run. */
  command: string;
  /**
   * The `benchmark.commands` entry (or step) name the input resolved to, or
   * undefined when the input was taken as a literal shell command.
   */
  resolvedFrom: string | undefined;
}

/**
 * Resolves a `--command`/`--prepare` value: when it names an entry in the
 * scenario's `benchmark.commands` — a top-level command name (e.g.
 * "warm compile") or a step name inside a step sequence (e.g. "cold compile")
 * — the entry's command string is used; otherwise the value is taken as a
 * literal shell command.
 *
 * Resolution does not execute `dependsOn` prerequisites: profiling runs a
 * single command, and required state (e.g. compiled artifacts) must already
 * exist or be produced via `--prepare`.
 */
export function resolveCommand(
  definition: ScenarioDefinition,
  commandOrName: string,
): ResolvedCommand {
  const commands = definition.benchmark?.commands ?? {};

  for (const [name, config] of Object.entries(commands)) {
    if ("steps" in config) {
      for (const [stepName, step] of Object.entries(config.steps)) {
        if (stepName === commandOrName) {
          return { command: step.command, resolvedFrom: stepName };
        }
      }
    } else if (name === commandOrName) {
      return { command: config.command, resolvedFrom: name };
    }
  }

  return { command: commandOrName, resolvedFrom: undefined };
}
