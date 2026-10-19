import type {
  Frame,
  TestOutcome,
  TestProfile,
  UnprofiledTest,
} from "./model.js";

import { formatGas, plural, share, times, walk } from "./model.js";
import { REPORT_CSS } from "./report-css.js";

export const REPORT_ISOLATION_NOTE =
  "Isolation is on: top-level call gas includes each call's transaction cost; see the report's notes.";

/**
 * What isolation changes. On EDR 0.23.0 it also subtracts refunds twice and
 * reports 0 gas for calls that halt or get only the 2,300 gas stipend (EDR
 * bugs, fixed upstream in NomicFoundation/edr#1844), so the report doesn't
 * present the refund as reliable when isolation is on.
 */
const ISOLATION_DETAILS =
  "Isolation is on: each top-level call runs as its own transaction, so its gas includes that transaction's cost and the profile differs from a run without isolation.";

export interface ReportInfo {
  hardhatVersion: string;
  edrVersion: string;
  isolation: boolean;
}

const ESCAPES = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES.get(c) ?? c);
}

/** Lets long test names wrap after `#` and before `_`. */
function breakable(text: string): string {
  return escapeHtml(text).replace(/#/g, "#<wbr>").replace(/_/g, "<wbr>_");
}

function pct(part: number, whole: number): string {
  return (whole === 0 ? 0 : (100 * part) / whole).toFixed(3);
}

/**
 * Renders the whole report as one static page: an index of the tests, then
 * one section per test, shown with `:target`. It has no JavaScript.
 */
export function renderReport(
  profiles: TestProfile[],
  unprofiled: UnprofiledTest[],
  info: ReportInfo,
): string {
  const ids = uniqueIds(profiles);
  const colours = colourSlots(profiles);
  const single = profiles.length === 1 && unprofiled.length === 0;
  const page = new Page(ids, colours, profiles.length, info.isolation);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hardhat gas profile</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<div class="page">
<header class="top">
  <p class="eyebrow">hardhat test solidity --gas-profile</p>
  <h1>Gas profile</h1>
  <p class="meta">Hardhat ${escapeHtml(info.hardhatVersion)} · EDR ${escapeHtml(info.edrVersion)} · isolation ${info.isolation ? "on" : "off"}</p>
  ${info.isolation ? `<p class="warn">${escapeHtml(REPORT_ISOLATION_NOTE)}</p>` : ""}
</header>
<main>
${page.index(profiles, unprofiled)}
${profiles.map((test) => page.test(test, single)).join("\n")}
</main>
<footer class="foot">
  <p>Gas inside internal functions counts as the calling contract's self gas: this report shows external calls and contract creations. Functions are named without parameter types, so overloads are merged. setUp runs before each test and isn't included.</p>
  <p>Static report with no JavaScript. Folded stacks for speedscope or inferno are in <code>folded/</code> next to this file. In them, <code>%</code>, <code>;</code>, tabs and line breaks in names are written as <code>%xx</code>, their hex code (for example <code>a;b</code> is <code>a%3bb</code>).</p>
</footer>
</div>
</body>
</html>
`;
}

function uniqueIds(profiles: TestProfile[]): Map<TestProfile, string> {
  const ids = new Map<TestProfile, string>();
  const used = new Set<string>();
  for (const test of profiles) {
    const base = test.fullName.replace(/[^A-Za-z0-9_-]/g, "_");
    let id = base;
    for (let n = 2; used.has(id); n++) {
      id = `${base}-${n}`;
    }
    used.add(id);
    ids.set(test, id);
  }
  return ids;
}

/** Contracts get one of 8 colours, by their self gas across the report. */
function colourSlots(profiles: TestProfile[]): Map<string, number> {
  const selfByContract = new Map<string, number>();
  for (const test of profiles) {
    walk(test.root, (frame, depth) => {
      if (
        depth > 0 &&
        frame.role === "contract" &&
        frame.contract !== undefined &&
        frame.contract !== test.suite
      ) {
        selfByContract.set(
          frame.contract,
          (selfByContract.get(frame.contract) ?? 0) + frame.self,
        );
      }
    });
  }
  return new Map(
    [...selfByContract.entries()]
      .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
      .map(([name], i) => [name, (i % 8) + 1]),
  );
}

class Page {
  readonly #ids: Map<TestProfile, string>;
  readonly #colours: Map<string, number>;
  readonly #count: number;
  readonly #isolation: boolean;

  constructor(
    ids: Map<TestProfile, string>,
    colours: Map<string, number>,
    count: number,
    isolation: boolean,
  ) {
    this.#ids = ids;
    this.#colours = colours;
    this.#count = count;
    this.#isolation = isolation;
  }

  public index(profiles: TestProfile[], unprofiled: UnprofiledTest[]): string {
    const max = profiles.reduce((m, t) => Math.max(m, t.testGas), 1);
    const rows = profiles.map((t) => {
      const id = this.#id(t);
      const heaviest = t.root.children.find((c) => c.role !== "group");
      return `<tr id="row-${id}"><th scope="row"><div class="cell-name"><a href="#t-${id}">${breakable(t.fullName)}</a><span class="bar-mini" aria-hidden="true" style="--w:${pct(t.testGas, max)}%"></span></div></th>${resultCell(t.outcome)}<td data-label="Test gas">${formatGas(t.testGas)}</td><td data-label="Calls">${formatGas(t.calls)}</td><td data-label="Heaviest call" class="text">${heaviest === undefined ? "–" : `${escapeHtml(heaviest.name + times(heaviest))} ${share(heaviest.total, t.executed)}`}</td></tr>`;
    });
    for (const t of unprofiled) {
      rows.push(
        `<tr><th scope="row">${breakable(t.fullName)}</th>${resultCell(t.outcome)}<td data-label="Test gas">–</td><td data-label="Calls">–</td><td data-label="Heaviest call" class="text">${escapeHtml(t.reason)}</td></tr>`,
      );
    }
    return `<section id="index" aria-labelledby="index-h">
  <h2 id="index-h" class="index-h">${plural(profiles.length, "test")} profiled</h2>
  <p class="figures">Sorted by test gas, as the test runner reports it. Open a test to see where its gas goes.</p>
  <div class="table-wrap" role="region" tabindex="0" aria-labelledby="index-h"><table class="index">
    <caption class="sr-only">Tests sorted by test gas</caption>
    <thead><tr><th scope="col">Test</th><th scope="col">Result</th><th scope="col">Test gas</th><th scope="col">Calls</th><th scope="col" class="text">Heaviest call</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table></div>
</section>`;
  }

  public test(t: TestProfile, single: boolean): string {
    const id = this.#id(t);
    const hot = t.hottest.map((frame, i) => {
      const last = i === t.hottest.length - 1 && frame.children.length > 0;
      return `<li>${escapeHtml(frame.name + times(frame))} ${share(frame.total, t.executed)}${last ? ` (self ${share(frame.self, t.executed)})` : ""}</li>`;
    });
    const rows = t.table.map((f) => {
      const tags = f.tags.map((tag) => ` <span class="tag">${tag}</span>`);
      const range =
        f.outerCalls > 1 && f.minCall !== f.maxCall
          ? `<span class="range">${formatGas(f.minCall)}–${formatGas(f.maxCall)}</span>`
          : "";
      const perCall =
        f.outerCalls > 1
          ? `${formatGas(Math.round(f.total / f.outerCalls))}${range}`
          : "–";
      return `<tr><th scope="row">${escapeHtml(f.name)}${tags.join("")}<span class="kind">${escapeHtml(f.kinds.join(", "))}</span></th><td data-label="Self gas">${formatGas(f.self)}</td><td data-label="Self %">${share(f.self, t.executed)}</td><td data-label="Total gas">${formatGas(f.total)}</td><td data-label="Calls">${formatGas(f.calls)}</td><td data-label="Per call">${perCall}</td></tr>`;
    });
    const refundRef =
      t.refund > 0 && !this.#isolation
        ? ` = ${formatGas(t.executed)} executed − ${formatGas(t.refund)} refunded<a class="ref" href="#n-${id}-1" aria-label="see the note on refunds">1</a>`
        : "";
    return `<section class="test${single ? " only" : ""}" id="t-${id}" aria-labelledby="h-${id}" tabindex="-1">
  ${single ? "" : `<a class="back" href="#row-${id}"><span aria-hidden="true">‹ </span>All tests (${this.#count})</a>`}
  <header class="test-head"><h2 id="h-${id}">${breakable(t.fullName)}</h2>${resultSpan(t.outcome)}</header>
  <p class="figures">Test gas <b>${formatGas(t.testGas)}</b>${refundRef} · ${plural(t.calls, "call")}</p>
  ${hot.length > 0 ? `<div class="hot"><span class="hot-label">Hottest path</span><ol class="hot-path" aria-label="Hottest path, by share of executed gas">${hot.join("")}</ol></div>` : `<p class="hot">No call takes a large share of this test's gas.</p>`}
  <figure class="graph-fig">
    <figcaption>Where the gas goes: each frame's width is its gas, its calls sit below it, heaviest first, and the dashed span at the end of a row is the gas the frame above used itself.</figcaption>
    ${this.#legend(t)}
    <div class="graph"><ul class="icicle" aria-label="Call tree of ${escapeHtml(t.fullName)}">${this.#frame(t.root, t, t.root.total)}</ul></div>
  </figure>
  <h3 id="fh-${id}">Functions in this test</h3>
  <p class="define">Self gas is what a function spent in its own code, including its internal functions and the cost of making calls, but not the external calls it makes. Total gas includes those calls.</p>
  <div class="table-wrap" role="region" tabindex="0" aria-labelledby="fh-${id}"><table class="fns">
    <caption class="sr-only">Functions in ${escapeHtml(t.fullName)}, sorted by self gas</caption>
    <thead><tr><th scope="col">Function</th><th scope="col">Self gas</th><th scope="col">Self %</th><th scope="col">Total gas</th><th scope="col">Calls</th><th scope="col">Per call</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table></div>
  <h3>Notes</h3>
  <ol class="notes">${notes(t, this.#isolation)
    .map((note, i) => `<li id="n-${id}-${i + 1}">${escapeHtml(note)}</li>`)
    .join("")}</ol>
</section>`;
  }

  #id(t: TestProfile): string {
    return this.#ids.get(t) ?? "";
  }

  #colour(frame: Frame, t: TestProfile): string {
    if (frame.role === "group") return "c-group";
    if (frame.role !== "contract" || frame.contract === undefined) {
      return "c-unknown";
    }
    if (frame.contract === t.suite) return "c-test";
    const slot = this.#colours.get(frame.contract);
    return slot === undefined ? "c-unknown" : `c-${slot}`;
  }

  #frame(frame: Frame, t: TestProfile, parentTotal: number): string {
    const colour = this.#colour(frame, t);
    const classes = ["f", colour];
    if (frame.failed) classes.push("failed");
    if (frame.role === "precompile") classes.push("precompile");
    if (frame.role === "group") classes.push("group");

    const name = frame.name + times(frame);
    const mark = frame.failed ? "✕ " : frame.clamped ? "⚠ " : "";
    const short =
      frame.role === "group"
        ? `+${frame.count}`
        : frame.kind === "create"
          ? frame.name
          : frame.name.slice(frame.name.indexOf(".") + 1) + times(frame);
    const label =
      frame.role === "group"
        ? labels(
            `${frame.name} · ${formatGas(frame.total)}`,
            `+${frame.count} · ${formatGas(frame.total)}`,
            short,
          )
        : labels(
            `${mark}${name} · ${formatGas(frame.total)} · ${share(frame.total, t.executed)}`,
            `${mark}${name} · ${formatGas(frame.total)}`,
            mark + short,
          );

    let kids = "";
    if (frame.children.length > 0) {
      const selfShare = share(frame.self, t.executed);
      const selfSpan =
        frame.self > 0
          ? `<li class="self ${colour}" style="--w:${pct(frame.self, frame.total)}%" title="${escapeHtml(`${name} self gas: ${formatGas(frame.self)} (${selfShare} of executed gas)`)}" aria-hidden="true"><span class="s-full">${escapeHtml(name)} self ${formatGas(frame.self)} · ${selfShare}</span><span class="s-mid">self ${formatGas(frame.self)}</span><span class="s-min">self</span></li>`
          : "";
      kids = `<ul class="kids">${frame.children.map((child) => this.#frame(child, t, frame.total)).join("")}${selfSpan}</ul>`;
    }
    const description = describe(frame, t);
    return `<li class="${classes.join(" ")}" style="--w:${pct(frame.total, parentTotal)}%"><div class="bar" title="${escapeHtml(description)}"><span class="sr-only">${escapeHtml(description)}.</span>${label}</div>${kids}</li>`;
  }

  #legend(t: TestProfile): string {
    const contracts = new Map<string, string>();
    const extras = new Set<string>();
    let hasSelf = false;
    walk(t.root, (frame) => {
      const colour = this.#colour(frame, t);
      if (frame.role === "contract" && frame.contract !== undefined) {
        contracts.set(frame.contract, colour);
      }
      if (frame.failed) extras.add("failed");
      if (frame.role !== "contract") extras.add(frame.role);
      hasSelf ||= frame.children.length > 0 && frame.self > 0;
    });
    const order = (cls: string) => {
      const slot = Number(cls.slice(2));
      return cls === "c-test" ? 0 : Number.isNaN(slot) ? 99 : slot;
    };
    const items = [...contracts.entries()]
      .sort((a, b) => order(a[1]) - order(b[1]))
      .map(
        ([name, cls]) =>
          `<li><span class="sw ${cls}" aria-hidden="true"></span>${escapeHtml(name)}${name === t.suite ? " (test)" : ""}</li>`,
      );
    if (hasSelf) {
      items.push(
        `<li><span class="sw self-sw c-test" aria-hidden="true"></span>self gas of the frame above</li>`,
      );
    }
    for (const [key, cls, text] of LEGEND_EXTRAS) {
      if (extras.has(key)) {
        items.push(
          `<li><span class="sw ${cls}" aria-hidden="true"></span>${text}</li>`,
        );
      }
    }
    return `<ul class="legend" aria-label="Legend">${items.join("")}</ul>`;
  }
}

const LEGEND_EXTRAS: Array<[string, string, string]> = [
  ["failed", "c-unknown failed", "failed call (✕)"],
  ["precompile", "c-unknown precompile", "precompile"],
  ["unknown", "c-unknown", "unidentified contract"],
  ["group", "c-group", "small calls grouped"],
];

function labels(full: string, mid: string, short: string): string {
  return `<span class="l-full" aria-hidden="true">${escapeHtml(full)}</span><span class="l-mid" aria-hidden="true">${escapeHtml(mid)}</span><span class="l-fn" aria-hidden="true">${escapeHtml(short)}</span>`;
}

function describe(frame: Frame, t: TestProfile): string {
  if (frame.role === "group") {
    const list = frame.grouped
      .map((c) => `${c.name}${times(c)} ${formatGas(c.total)}`)
      .join(", ");
    return `${frame.count} small calls, ${formatGas(frame.total)} gas together: ${list}`;
  }
  const parts = [
    frame.name + times(frame),
    frame.failed ? "failed" : frame.kind,
    `${formatGas(frame.total)} gas, ${share(frame.total, t.executed)} of executed gas`,
  ];
  if (frame.children.length > 0) parts.push(`self ${formatGas(frame.self)}`);
  if (frame.count > 1) {
    parts.push(
      frame.minCall === frame.maxCall
        ? `each ${formatGas(frame.minCall)}`
        : `per call ${formatGas(frame.minCall)} to ${formatGas(frame.maxCall)}`,
    );
  }
  if (frame.clamped) parts.push("self gas clamped to 0");
  return parts.join(", ");
}

function notes(t: TestProfile, isolation: boolean): string[] {
  const list: string[] = [];
  if (isolation) {
    list.push(
      `${ISOLATION_DETAILS} The refund can't be separated under isolation: the test gas is ${formatGas(t.testGas)} and the executed gas is ${formatGas(t.executed)}. Percentages are of executed gas.`,
    );
  } else if (t.refund > 0) {
    list.push(
      `Executed gas is ${formatGas(t.executed)}. At the end of the test ${formatGas(t.refund)} gas was refunded (for example for clearing storage), so the test gas is ${formatGas(t.testGas)}. Refunds aren't attributed to any frame, and percentages are of executed gas.`,
    );
  } else if (t.unaccounted > 0) {
    list.push(
      `The test gas of ${formatGas(t.testGas)} is ${formatGas(t.unaccounted)} more than the trace's executed gas of ${formatGas(t.executed)}; the difference isn't attributed to any frame. Percentages are of executed gas.`,
    );
  } else if (t.outcome === "failed") {
    list.push(
      `The test failed, so no refund was applied: executed gas equals the test gas of ${formatGas(t.testGas)}. Percentages are of executed gas.`,
    );
  } else {
    list.push(
      `No gas was refunded: executed gas equals the test gas of ${formatGas(t.testGas)}. Percentages are of executed gas.`,
    );
  }
  if (t.hasFailedFrame) {
    list.push(
      "A failed call reverted, ran out of gas, or hit an invalid opcode; the trace doesn't say which. Gas a failed call was given but didn't use goes back to the caller.",
    );
  }
  if (t.hasCreate) {
    list.push(
      "A creation frame holds the constructor and the code deposit (200 gas per byte). The 32,000 creation cost and the init code are in the caller's self gas.",
    );
  }
  if (t.dropped.length > 0) {
    list.push(
      `${t.dropped.join(" and ")} calls cost no gas here and aren't shown. Their call overhead is in the caller's self gas.`,
    );
  }
  if (t.clamped.length > 0) {
    list.push(
      `${plural(t.clamped.length, "frame")} show 0 self gas because their calls reported more gas than they did: ${t.clamped.join(", ")}.`,
    );
  }
  return list;
}

function outcomeClass(outcome: TestOutcome): string {
  return outcome === "passed" ? "ok" : outcome === "failed" ? "bad" : "skip";
}

function resultCell(outcome: TestOutcome): string {
  return `<td data-label="Result" class="${outcomeClass(outcome)}">${outcome}</td>`;
}

function resultSpan(outcome: TestOutcome): string {
  return `<span class="result ${outcomeClass(outcome)}">${outcome}</span>`;
}
