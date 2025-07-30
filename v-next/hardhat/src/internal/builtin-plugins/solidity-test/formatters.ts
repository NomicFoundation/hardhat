import type {
  LogTrace,
  ArtifactId,
  CallTrace,
  DecodedTraceParameters,
} from "@nomicfoundation/edr";

import { LogKind, CallKind } from "@nomicfoundation/edr";
import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";
import chalk from "chalk";

export interface Colorizer {
  blue: (text: string) => string;
  green: (text: string) => string;
  red: (text: string) => string;
  cyan: (text: string) => string;
  yellow: (text: string) => string;
  grey: (text: string) => string;
  dim: (text: string) => string;
}

type NestedArray<T> = Array<T | NestedArray<T>>;

export function formatArtifactId(
  artifactId: ArtifactId,
  sourceNameToUserSourceName: Map<string, string>,
): string {
  const sourceName =
    sourceNameToUserSourceName.get(artifactId.source) ?? artifactId.source;

  return `${sourceName}:${artifactId.name}`;
}

export function formatLogs(
  logs: string[],
  indent: number,
  colorizer: Colorizer,
): string {
  return colorizer.grey(
    logs.map((log) => `${" ".repeat(indent)}${log}`).join("\n"),
  );
}

function formatInputs(
  inputs: DecodedTraceParameters | Uint8Array,
  color?: (text: string) => string,
): string | undefined {
  if (inputs instanceof Uint8Array) {
    return inputs.length > 0 ? bytesToHexString(inputs) : undefined;
  } else {
    const formattedName =
      color !== undefined ? color(inputs.name) : inputs.name;
    return `${formattedName}(${inputs.arguments.join(", ")})`;
  }
}

function formatOutputs(outputs: string | Uint8Array): string | undefined {
  if (outputs instanceof Uint8Array) {
    return outputs.length > 0 ? bytesToHexString(outputs) : undefined;
  } else {
    return outputs;
  }
}

function formatLog(log: LogTrace, colorizer: Colorizer = chalk): string[] {
  const { parameters } = log;
  const lines = [];
  if (Array.isArray(parameters)) {
    const topics = parameters.map((topic) => bytesToHexString(topic));
    if (topics.length > 0) {
      lines.push(`emit topic 0: ${colorizer.cyan(topics[0])}`);
    }
    for (let i = 1; i < topics.length - 1; i++) {
      lines.push(`     topic ${i}: ${colorizer.cyan(topics[i])}`);
    }
    if (topics.length > 1) {
      lines.push(`        data: ${colorizer.cyan(topics[topics.length - 1])}`);
    }
  } else {
    lines.push(
      `emit ${parameters.name}(${colorizer.cyan(parameters.arguments.join(", "))})`,
    );
  }
  return lines;
}

function formatKind(kind: CallKind): string | undefined {
  assertHardhatInvariant(
    kind !== CallKind.Create,
    "Unexpected call kind 'Create'",
  );

  switch (kind) {
    case CallKind.Call:
      return undefined;
    case CallKind.CallCode:
      return "callcode";
    case CallKind.DelegateCall:
      return "delegatecall";
    case CallKind.StaticCall:
      return "staticcall";
  }
}

function formatTrace(
  trace: CallTrace,
  colorizer: Colorizer,
): NestedArray<string> {
  const {
    success,
    contract,
    inputs,
    gasUsed,
    value,
    kind,
    isCheatcode,
    outputs,
  } = trace;
  let color;
  if (isCheatcode) {
    color = colorizer.blue;
  } else if (success) {
    color = colorizer.green;
  } else {
    color = colorizer.red;
  }

  const formattedInputs = formatInputs(inputs, color);
  const formattedOutputs = formatOutputs(outputs);

  let openingLine: string;
  let closingLine: string | undefined;
  if (kind === CallKind.Create) {
    openingLine = `[${gasUsed}] ${colorizer.yellow("→ new")} ${contract}`;
    // TODO: Uncomment this when the formattedInputs starts containing
    // the address of where the contract was deployed instead of the code.
    // if (formattedInputs !== undefined) {
    //   openingLine = `${openingLine}@${formattedInputs}`;
    // }
  } else {
    const formattedKind = formatKind(kind);
    openingLine = `[${gasUsed}] ${color(contract)}`;
    if (formattedInputs !== undefined) {
      openingLine = `${openingLine}::${formattedInputs}`;
    }
    if (value !== BigInt(0)) {
      openingLine = `${openingLine} {value: ${value}}`;
    }
    if (formattedKind !== undefined) {
      openingLine = `${openingLine} ${colorizer.yellow(`[${formattedKind}]`)}`;
    }
  }
  if (formattedOutputs !== undefined) {
    if (
      formattedOutputs === "EvmError: Revert" ||
      formattedOutputs.startsWith("revert:")
    ) {
      closingLine = `${color("←")} ${color("[Revert]")} ${formattedOutputs}`;
    } else {
      closingLine = `${color("←")} ${formattedOutputs}`;
    }
  }

  const lines = [];
  lines.push(openingLine);
  for (const child of trace.children) {
    if (child.kind === LogKind.Log) {
      lines.push(formatLog(child));
    } else {
      lines.push(formatTrace(child, colorizer));
    }
  }
  if (closingLine !== undefined) {
    lines.push([closingLine]);
  }
  return lines;
}

function formatNestedArray(
  data: NestedArray<string>,
  prefix = "",
  isTopLevel = true,
): string {
  let output = "";

  for (let i = 0; i < data.length; i++) {
    const item = data[i];

    if (Array.isArray(item) && typeof item[0] === "string") {
      const [label, ...children] = item;

      if (isTopLevel) {
        output += `${prefix}${label}\n`;
        output += formatNestedArray(children, prefix, false);
      } else {
        const isLast = i === data.length - 1;
        const connector = isLast ? "  └─ " : "  ├─ ";
        const childPrefix = isLast ? "     " : "  │  ";
        output += `${prefix}${connector}${label}\n`;
        output += formatNestedArray(children, prefix + childPrefix, false);
      }
    } else if (typeof item === "string") {
      const isLast = i === data.length - 1;
      const connector = isLast ? "  └─ " : "  ├─ ";
      output += `${prefix}${connector}${item}\n`;
    }
  }

  return output;
}

export function formatTraces(
  traces: CallTrace[],
  prefix: string,
  colorizer: Colorizer,
): string {
  const lines = traces.map((trace) => formatTrace(trace, colorizer));
  const formattedTraces = formatNestedArray(lines, prefix);
  // Remove the trailing newline
  return formattedTraces.slice(0, -1);
}
