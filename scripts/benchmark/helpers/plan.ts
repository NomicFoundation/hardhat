import type {
  CommandConfig,
  CommandVariant,
  StepsVariant,
} from "../../end-to-end/types.ts";

/**
 * One command to execute as part of a run plan (see {@link planCommands}),
 * either a single command ({@link CommandData}) or a step sequence
 * ({@link StepData}).
 */
export type PlannedCommand = CommandData | StepData;

/**
 * A single command benchmarked with hyperfine. `emit` says whether to report it
 * (it may run purely as a prerequisite of a later command).
 */
export interface CommandData {
  name: string;
  cfg: CommandVariant;
  emit: boolean;
}

/**
 * A step sequence run in-process. `run` lists the steps to execute in order (a
 * subset — selected steps plus their prerequisites); `emit` lists the measured
 * steps to report. Steps in `run` but not in `emit` are prerequisites only.
 */
export interface StepData {
  name: string;
  cfg: StepsVariant;
  run: string[];
  emit: string[];
}

// Convert a glob (supporting `*` and `?`) to an anchored RegExp. Every other
// character is matched literally, so command/step names with spaces, `&`, `:`,
// `/`, `.` etc. work as-is.
export function globToRegExp(glob: string): RegExp {
  let source = "";

  for (const ch of glob) {
    if (ch === "*") {
      source += ".*";
    } else if (ch === "?") {
      source += ".";
    } else {
      source += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }

  return new RegExp(`^${source}$`);
}

// `undefined` filters mean "no filter" and match everything.
export function compilePatterns(
  patterns: string[] | undefined,
): RegExp[] | undefined {
  return patterns?.map(globToRegExp);
}

export function matchesAny(
  name: string,
  patterns: RegExp[] | undefined,
): boolean {
  return patterns === undefined || patterns.some((re) => re.test(name));
}

export function parseGlobList(raw: string | undefined): string[] | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return list.length > 0 ? list : undefined;
}

/**
 * A benchmark entry, flattened across commands in declared order. A single
 * command is one entry (`command` name); a step sequence contributes one entry
 * per step (`step` name), tagged with its owning command (`owner`).
 */
interface Entry {
  name: string;
  index: number;
  kind: "single" | "step";
  owner: string;
  measure: boolean;
  dependsOn: string[] | undefined;
}

function flattenEntries(commands: Record<string, CommandConfig>): Entry[] {
  const entries: Entry[] = [];

  for (const [cmdName, cfg] of Object.entries(commands)) {
    if ("steps" in cfg) {
      for (const [stepName, step] of Object.entries(cfg.steps)) {
        entries.push({
          name: stepName,
          index: entries.length,
          kind: "step",
          owner: cmdName,
          measure: step.measure !== false,
          dependsOn: step.dependsOn,
        });
      }
    } else {
      entries.push({
        name: cmdName,
        index: entries.length,
        kind: "single",
        owner: cmdName,
        measure: true,
        dependsOn: cfg.dependsOn,
      });
    }
  }

  return entries;
}

/**
 * Build the run plan for one scenario's commands under `--benchmarks`.
 *
 * Selection (which entries the user asked to *report*): an entry is selected
 * when it is measured and its name matches `--benchmarks` (unset matches all).
 * "Name" is the report label's second segment — a single command's name, or a
 * measured step's name. The step-sequence container name is not itself an entry.
 *
 * Prerequisites (what must also *run*, unreported): commands/steps are a
 * stateful pipeline, so each selected entry pulls in the transitive closure of
 * its declared `dependsOn` entries (they run but are only reported if also
 * selected). There are no implicit prerequisites: an entry with no `dependsOn`
 * runs in isolation. Declaring what an entry depends on is the scenario author's
 * responsibility.
 *
 * Entries run in declared order; only entries in the resulting run set run, and
 * only selected entries are reported. Returns `[]` when nothing is selected
 * (the scenario is skipped before any expensive init).
 *
 * Throws if a `dependsOn` names a nonexistent entry, or one declared after the
 * dependent (dependencies must precede their dependents).
 */
export function planCommands(
  commands: Record<string, CommandConfig>,
  benchmarkFilters: string[] | undefined,
): PlannedCommand[] {
  const res = compilePatterns(benchmarkFilters);

  const entries = flattenEntries(commands);
  const byName = new Map(entries.map((e) => [e.name, e]));

  for (const e of entries) {
    for (const dep of e.dependsOn ?? []) {
      const depEntry = byName.get(dep);
      if (depEntry === undefined) {
        throw new Error(
          `Entry "${e.name}" dependsOn "${dep}", which is not a command or step in this scenario`,
        );
      }
      if (depEntry.index >= e.index) {
        throw new Error(
          `Entry "${e.name}" dependsOn "${dep}", but dependencies must be declared before the dependent entry`,
        );
      }
    }
  }

  // A single command's name, or a measured step's name, matched against the
  // filter. measure:false steps (setup/reset) are never selected on their own.
  const isSelected = (e: Entry): boolean =>
    e.measure && matchesAny(e.name, res);

  const selected = new Set(entries.filter(isSelected).map((e) => e.name));

  if (selected.size === 0) {
    return [];
  }

  // Grow the run set from the selection: each selected entry plus the
  // transitive closure of its declared dependencies. There are no implicit
  // prerequisites — an entry with no `dependsOn` runs in isolation.
  const runSet = new Set<string>();

  const addDeclared = (name: string): void => {
    if (runSet.has(name)) {
      return;
    }
    runSet.add(name);
    for (const dep of byName.get(name)?.dependsOn ?? []) {
      addDeclared(dep);
    }
  };

  for (const e of entries) {
    if (selected.has(e.name)) {
      addDeclared(e.name);
    }
  }

  const plan: PlannedCommand[] = [];

  for (const [cmdName, cfg] of Object.entries(commands)) {
    if ("steps" in cfg) {
      const stepNames = Object.keys(cfg.steps);
      const run = stepNames.filter((n) => runSet.has(n));
      if (run.length === 0) {
        continue;
      }
      const emit = stepNames.filter((n) => selected.has(n));
      plan.push({ name: cmdName, cfg, run, emit });
    } else {
      if (!runSet.has(cmdName)) {
        continue;
      }
      plan.push({ name: cmdName, cfg, emit: selected.has(cmdName) });
    }
  }

  return plan;
}
