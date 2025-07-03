import type {
  LogTrace,
  ArtifactId,
  CallTrace,
  DecodedTraceParameters,
} from "@ignored/edr-optimism";

import { LogKind, CallKind } from "@ignored/edr-optimism";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";
import chalk from "chalk";

export function formatArtifactId(
  artifactId: ArtifactId,
  sourceNameToUserSourceName: Map<string, string>,
): string {
  const sourceName =
    sourceNameToUserSourceName.get(artifactId.source) ?? artifactId.source;

  return `${chalk.bold(`${sourceName}:${artifactId.name}`)} (v${artifactId.solcVersion})`;
}

export function formatLogs(logs: string[], indent: number): string {
  return chalk.grey(
    logs.map((log) => `${" ".repeat(indent)}${log}`).join("\n"),
  );
}

function formatInputs(inputs: DecodedTraceParameters | Uint8Array): string {
  if (inputs instanceof Uint8Array) {
    return bytesToHexString(inputs);
  } else {
    return `${inputs.name}(${inputs.arguments.join(", ")})`;
  }
}

function formatOutputs(outputs: string | Uint8Array): string {
  if (outputs instanceof Uint8Array) {
    return bytesToHexString(outputs);
  } else {
    return outputs;
  }
}

function formatLog(log: LogTrace, indent: number): string {
  const { parameters } = log;
  if (Array.isArray(parameters)) {
    const topics = parameters
      .slice(0, parameters.length - 1)
      .map((topic) => bytesToHexString(topic));
    const data = bytesToHexString(parameters[parameters.length - 1]);
    return `${" ".repeat(indent)}${chalk.grey(`(topics: [${topics.join(", ")}], data: ${data})`)}`;
  } else {
    return `${" ".repeat(indent)}${parameters.name}(${parameters.arguments.join(", ")})`;
  }
}

function formatKind(kind: CallKind): string {
  switch (kind) {
    case CallKind.Call:
      return "Call";
    case CallKind.CallCode:
      return "CallCode";
    case CallKind.DelegateCall:
      return "DelegateCall";
    case CallKind.StaticCall:
      return "StaticCall";
    case CallKind.Create:
      return "Create";
  }
}

function formatTrace(trace: CallTrace, indent: number): string {
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
  const color = success ? chalk.blue : chalk.yellow;
  const sign = success ? "✔" : "✘";
  const label = success ? "Succeeded" : "Failed";
  const lines = [
    `${" ".repeat(indent)}${color(`${sign} ${formatKind(kind)} ${label}`)}: ${contract}::${formatInputs(inputs)} → ${formatOutputs(outputs)} ${chalk.grey(`(gas: ${gasUsed}, tokens: ${value}, cheatcode: ${isCheatcode})`)}`,
  ];
  for (const child of trace.children) {
    if (child.kind === LogKind.Log) {
      lines.push(formatLog(child, indent + 2));
    } else {
      lines.push(formatTrace(child, indent + 2));
    }
  }
  return lines.join("\n");
}

export function formatTraces(traces: CallTrace[], indent: number): string {
  return traces.map((trace) => formatTrace(trace, indent)).join("\n");
}
