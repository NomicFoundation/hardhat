import type { Colorizer } from "../../../../utils/colorizer.js";
import type {
  LogTrace,
  CallTrace,
  DecodedTraceParameters,
} from "@nomicfoundation/edr";

import { LogKind, CallKind, IncludeTraces } from "@nomicfoundation/edr";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";

type NestedArray<T> = Array<T | NestedArray<T>>;

export function verbosityToIncludeTraces(verbosity: number): IncludeTraces {
  if (verbosity >= 4) {
    return IncludeTraces.All;
  } else if (verbosity >= 3) {
    return IncludeTraces.Failing;
  }

  return IncludeTraces.None;
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

function formatLog(log: LogTrace, colorizer: Colorizer): string[] {
  const { parameters } = log;
  const tag = colorizer.yellow("[event]");
  const lines = [];

  if (Array.isArray(parameters)) {
    const hexValues = parameters.map((bytes) => bytesToHexString(bytes));
    const topicCount = hexValues.length - 1;

    for (let i = 0; i < topicCount; i++) {
      const prefix = i === 0 ? `${tag} topic 0` : `        topic ${i}`;
      lines.push(`${prefix}: ${colorizer.cyan(hexValues[i])}`);
    }

    if (hexValues.length > 0) {
      const dataPrefix = topicCount > 0 ? "           data" : `${tag}    data`;
      lines.push(
        `${dataPrefix}: ${colorizer.cyan(hexValues[hexValues.length - 1])}`,
      );
    }
  } else {
    lines.push(
      `${tag} ${parameters.name}(${colorizer.cyan(parameters.arguments.join(", "))})`,
    );
  }
  return lines;
}

function formatTrace(
  trace: CallTrace,
  colorizer: Colorizer,
): NestedArray<string> {
  const {
    success,
    address,
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
    openingLine = `[${gasUsed}] ${colorizer.yellow("→ new")} ${contract ?? "<unknown>"}@${address}`;
    // TODO: Uncomment this when the formattedInputs starts containing
    // the address of where the contract was deployed instead of the code.
    // if (formattedInputs !== undefined) {
    //   openingLine = `${openingLine}@${formattedInputs}`;
    // }
  } else {
    openingLine = `[${gasUsed}] ${color(contract ?? address)}`;
    if (formattedInputs !== undefined) {
      openingLine = `${openingLine}::${formattedInputs}`;
    }
    if (value !== 0n) {
      openingLine = `${openingLine} {value: ${value}}`;
    }
    if (kind === CallKind.StaticCall) {
      openingLine = `${openingLine} ${colorizer.yellow("[staticcall]")}`;
    } else if (kind === CallKind.DelegateCall) {
      openingLine = `${openingLine} ${colorizer.yellow("[delegatecall]")}`;
    } else if (kind === CallKind.CallCode) {
      openingLine = `${openingLine} ${colorizer.yellow("[callcode]")}`;
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
      lines.push(formatLog(child, colorizer));
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
        // Blank line between top-level traces
        if (i > 0) {
          output += "\n";
        }

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
