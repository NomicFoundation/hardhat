import type { CallTrace, LogTrace, TestResult } from "@nomicfoundation/edr";

import { CallKind, LogKind, TestStatus } from "@nomicfoundation/edr";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";

/** Frames under this share of the test's executed gas are grouped. */
const TINY_SHARE = 0.0025;
/** The hottest path stops at a frame under this share, or after this many hops. */
const HOT_MIN_SHARE = 0.1;
const HOT_MAX_HOPS = 4;

const CONSOLE_ADDRESS = "0x000000000000000000636f6e736f6c652e6c6f67";
/** EDR's label for precompile frames. */
const PRECOMPILES_LABEL = "PRECOMPILES";
/** 0x01 to 0x11 (up to the BLS12-381 ones), and P256VERIFY at 0x100. */
const PRECOMPILE_ADDRESSES = new Set([
  ...Array.from({ length: 0x11 }, (_, i) => BigInt(i + 1)),
  0x100n,
]);

export type TestOutcome = "passed" | "failed" | "skipped";

export type FrameRole = "contract" | "precompile" | "unknown" | "group";

export interface Frame {
  name: string;
  /** The contract's name, or undefined when EDR couldn't identify it. */
  contract: string | undefined;
  role: FrameRole;
  kind: string;
  failed: boolean;
  /** Gas of the frame, including its calls (summed over merged calls). */
  total: number;
  /** Gas spent in the frame's own code (summed over merged calls). */
  self: number;
  /** The number of merged calls, and the lightest and heaviest of them. */
  count: number;
  minCall: number;
  maxCall: number;
  clamped: boolean;
  children: Frame[];
  /** The frames a "+N small calls" group stands for. */
  grouped: Frame[];
}

export interface FunctionRow {
  name: string;
  self: number;
  /** Total gas, counting a recursive call only once, at its outermost call. */
  total: number;
  /** Every call, including recursive ones. */
  calls: number;
  /** Outermost calls, which `total`, `minCall` and `maxCall` describe. */
  outerCalls: number;
  minCall: number;
  maxCall: number;
  kinds: string[];
  tags: string[];
}

interface TestInfo {
  suite: string;
  testName: string;
  fullName: string;
  outcome: TestOutcome;
}

export interface TestProfile extends TestInfo {
  /** The gas the test runner reports. */
  testGas: number;
  /** The root frame's gas: every frame's gas adds up to it. */
  executed: number;
  /** Gas refunded at the end of the test, never negative. */
  refund: number;
  /** Test gas that the trace doesn't account for (it should be 0). */
  unaccounted: number;
  calls: number;
  root: Frame;
  table: FunctionRow[];
  folded: string[];
  dropped: Array<"cheatcode" | "console.log">;
  clamped: string[];
  hasFailedFrame: boolean;
  hasCreate: boolean;
  hottest: Frame[];
}

export interface UnprofiledTest extends TestInfo {
  reason: string;
}

export function profileTest(
  suite: string,
  testResult: TestResult,
): TestProfile | UnprofiledTest {
  const testName = testResult.name.replace(/\(.*$/, "");
  const info: TestInfo = {
    suite,
    testName,
    fullName: `${suite}#${testName}`,
    outcome:
      testResult.status === TestStatus.Skipped
        ? "skipped"
        : testResult.status === TestStatus.Failure
          ? "failed"
          : "passed",
  };

  if (info.outcome === "skipped") {
    return { ...info, reason: "skipped" };
  }
  if (!("consumedGas" in testResult.kind)) {
    return { ...info, reason: "fuzz and invariant tests aren't profiled" };
  }

  // EDR returns [setUp?, test]; the test's own call is the last root.
  const rootTrace = testResult.callTraces().at(-1);
  if (rootTrace === undefined) {
    return { ...info, reason: "no trace was recorded" };
  }
  if (
    !(rootTrace.inputs instanceof Uint8Array) &&
    rootTrace.inputs.name === "setUp"
  ) {
    return { ...info, reason: "only setUp ran" };
  }

  const dropped = new Set<"cheatcode" | "console.log">();
  const clamped: string[] = [];
  const root = buildFrame(rootTrace, dropped, clamped);
  const folded: string[] = [];
  addFoldedLines(root, "", folded);
  mergeChildren(root);
  const table = functionTable(root);
  groupTinyFrames(root, root.total * TINY_SHARE);

  const testGas = Number(testResult.kind.consumedGas);
  let hasFailedFrame = false;
  walk(root, (frame, depth) => {
    hasFailedFrame ||= depth > 0 && frame.failed;
  });

  return {
    ...info,
    testGas,
    executed: root.total,
    refund: Math.max(root.total - testGas, 0),
    unaccounted: Math.max(testGas - root.total, 0),
    calls: folded.length - 1,
    root,
    table,
    folded,
    dropped: [...dropped],
    clamped,
    hasFailedFrame,
    hasCreate: table.some((row) => row.kinds.includes("create")),
    hottest: hottestPath(root),
  };
}

export function isProfiled(
  test: TestProfile | UnprofiledTest,
): test is TestProfile {
  return "root" in test;
}

function isCall(child: CallTrace | LogTrace): child is CallTrace {
  return child.kind !== LogKind.Log;
}

function kindName(kind: CallKind): string {
  switch (kind) {
    case CallKind.Call:
      return "call";
    case CallKind.CallCode:
      return "callcode";
    case CallKind.DelegateCall:
      return "delegatecall";
    case CallKind.StaticCall:
      return "staticcall";
    case CallKind.Create:
      return "create";
  }
}

function frameName(trace: CallTrace): string {
  if (trace.kind === CallKind.Create) {
    return `new ${trace.contract ?? "<unknown>"}`;
  }

  const target =
    trace.contract ?? `${trace.address.slice(0, 6)}…${trace.address.slice(-4)}`;
  if (!(trace.inputs instanceof Uint8Array)) {
    return `${target}.${trace.inputs.name}`;
  }
  // Undecoded calldata: name its selector, or the function that empty or
  // short calldata runs.
  if (trace.inputs.length >= 4) {
    return `${target}.${bytesToHexString(trace.inputs.slice(0, 4))}`;
  }
  const isPlainTransfer = trace.inputs.length === 0 && trace.value > 0n;
  return `${target}.${isPlainTransfer ? "receive" : "fallback"}`;
}

function frameRole(trace: CallTrace): FrameRole {
  if (
    trace.kind !== CallKind.Create &&
    (trace.contract === PRECOMPILES_LABEL ||
      PRECOMPILE_ADDRESSES.has(BigInt(trace.address)))
  ) {
    return "precompile";
  }
  return trace.contract === undefined ? "unknown" : "contract";
}

/**
 * Builds a frame per call, without cheatcode and console.log calls: they
 * report no gas, and their call overhead is already in the caller's self gas.
 */
function buildFrame(
  trace: CallTrace,
  dropped: Set<"cheatcode" | "console.log">,
  clamped: string[],
): Frame {
  const children: Frame[] = [];
  let childGas = 0;
  for (const child of trace.children) {
    if (!isCall(child)) {
      continue;
    }
    if (child.isCheatcode) {
      dropped.add("cheatcode");
    } else if (child.address.toLowerCase() === CONSOLE_ADDRESS) {
      dropped.add("console.log");
    } else {
      const frame = buildFrame(child, dropped, clamped);
      childGas += frame.total;
      children.push(frame);
    }
  }

  const name = frameName(trace);
  const total = Number(trace.gasUsed);
  const self = total - childGas;
  if (self < 0) {
    clamped.push(name);
  }

  return {
    name,
    contract: trace.contract,
    role: frameRole(trace),
    kind: kindName(trace.kind),
    failed: !trace.success,
    total,
    self: Math.max(self, 0),
    count: 1,
    minCall: total,
    maxCall: total,
    clamped: self < 0,
    children,
    grouped: [],
  };
}

/**
 * Escapes `%`, the frame separator `;`, line breaks and tabs as `%xx` with
 * the character's hex code, so a frame name always stays one frame on one
 * line. For example, `a;b` is written as `a%3bb`.
 */
export function escapeFoldedFrame(name: string): string {
  return name.replace(
    /[%;\r\n\t]/g,
    (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`,
  );
}

/** One line per call, in execution order, weighted by self gas. */
function addFoldedLines(frame: Frame, prefix: string, out: string[]): void {
  const stack = prefix + escapeFoldedFrame(frame.name);
  out.push(`${stack} ${frame.self}`);
  for (const child of frame.children) {
    addFoldedLines(child, `${stack};`, out);
  }
}

/** Merges sibling calls to the same function, heaviest first. */
function mergeChildren(frame: Frame): void {
  const merged = new Map<string, Frame>();
  for (const child of frame.children) {
    const key = `${child.name}|${child.kind}|${child.failed}`;
    const existing = merged.get(key);
    if (existing === undefined) {
      merged.set(key, child);
    } else {
      existing.total += child.total;
      existing.self += child.self;
      existing.count += child.count;
      existing.minCall = Math.min(existing.minCall, child.minCall);
      existing.maxCall = Math.max(existing.maxCall, child.maxCall);
      for (const grandchild of child.children) {
        existing.children.push(grandchild);
      }
      existing.clamped ||= child.clamped;
    }
  }
  frame.children = [...merged.values()].sort((a, b) => b.total - a.total);
  frame.children.forEach(mergeChildren);
}

function groupTinyFrames(frame: Frame, threshold: number): void {
  const tiny = new Set(frame.children.filter((c) => c.total < threshold));
  if (tiny.size >= 2) {
    let total = 0;
    for (const child of tiny) {
      total += child.total;
    }
    frame.children = frame.children.filter((child) => !tiny.has(child));
    frame.children.push({
      name: `+${tiny.size} small calls`,
      contract: undefined,
      role: "group",
      kind: "group",
      failed: false,
      total,
      self: 0,
      count: tiny.size,
      minCall: 0,
      maxCall: 0,
      clamped: false,
      children: [],
      grouped: [...tiny],
    });
  }
  frame.children.forEach((child) => groupTinyFrames(child, threshold));
}

export function walk(
  frame: Frame,
  visit: (frame: Frame, depth: number) => void,
  depth = 0,
): void {
  visit(frame, depth);
  frame.children.forEach((child) => walk(child, visit, depth + 1));
}

/** Every function of the test, summed over its call sites, by self gas. */
function functionTable(root: Frame): FunctionRow[] {
  const rows = new Map<string, FunctionRow>();
  // How many frames with each name are on the path from the root.
  const open = new Map<string, number>();

  const visit = (frame: Frame, depth: number) => {
    let row = rows.get(frame.name);
    if (row === undefined) {
      row = {
        name: frame.name,
        self: 0,
        total: 0,
        calls: 0,
        outerCalls: 0,
        minCall: Infinity,
        maxCall: 0,
        kinds: [],
        tags: [],
      };
      rows.set(frame.name, row);
    }
    row.self += frame.self;
    row.calls += frame.count;
    // A recursive call's gas is already in its outermost call's total.
    const nesting = open.get(frame.name) ?? 0;
    if (nesting === 0) {
      row.total += frame.total;
      row.outerCalls += frame.count;
      row.minCall = Math.min(row.minCall, frame.minCall);
      row.maxCall = Math.max(row.maxCall, frame.maxCall);
    }
    addOnce(row.kinds, depth === 0 ? "test" : frame.kind);
    if (frame.failed) addOnce(row.tags, "failed");
    if (frame.role === "precompile") addOnce(row.tags, "precompile");
    if (frame.clamped) addOnce(row.tags, "clamped");

    open.set(frame.name, nesting + 1);
    for (const child of frame.children) {
      visit(child, depth + 1);
    }
    open.set(frame.name, nesting);
  };
  visit(root, 0);

  return [...rows.values()].sort((a, b) =>
    b.self !== a.self ? b.self - a.self : a.name.localeCompare(b.name),
  );
}

function addOnce(list: string[], value: string): void {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function hottestPath(root: Frame): Frame[] {
  const path: Frame[] = [];
  let next = root.children.at(0);
  while (
    next !== undefined &&
    next.role !== "group" &&
    next.total >= root.total * HOT_MIN_SHARE &&
    path.length < HOT_MAX_HOPS
  ) {
    path.push(next);
    next = next.children.at(0);
  }
  return path;
}

export function formatGas(n: number): string {
  return n.toLocaleString("en-US");
}

export function share(part: number, whole: number): string {
  const value = whole === 0 ? 0 : (100 * part) / whole;
  return value > 0 && value < 0.1 ? "<0.1%" : `${value.toFixed(1)}%`;
}

/** " ×N" for a frame that stands for N merged calls. */
export function times(frame: Frame): string {
  return frame.count > 1 && frame.role !== "group" ? ` ×${frame.count}` : "";
}

export function plural(n: number, word: string): string {
  return `${formatGas(n)} ${word}${n === 1 ? "" : "s"}`;
}
