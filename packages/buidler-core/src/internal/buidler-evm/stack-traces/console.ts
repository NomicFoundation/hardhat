import { BN, bufferToInt, fromSigned } from "ethereumjs-util";

const Uint = "Uint";

export function maybeConsoleLog(input: Buffer) {
  const sig = bufferToInt(input.slice(0, 4));
  const types = consoleLogs[sig];
  if (types === undefined) {
    return;
  }

  return decode(input.slice(4), types);
}

function decode(data: Buffer, types: string[]): ConsoleLogs {
  const logs: ConsoleLogs = [];

  let offset = 0;

  for (const type of types) {
    switch (type) {
      case Uint:
        logs.push({
          // TODO: investigate deprecation warning.
          value: fromSigned(data.slice(offset, 32))
        });
        offset += 32;
    }
  }

  return logs;
}

export interface ConsoleLogUintEntry {
  value: BN;
}

interface ConsoleLogArray extends Array<ConsoleLogEntry> {}

export type ConsoleLogEntry = ConsoleLogUintEntry | ConsoleLogArray;

export type ConsoleLogs = ConsoleLogEntry[];

const consoleLogs: {
  [key: number]: string[];
} = {};

////// Generated Code begin /////
consoleLogs[4163653873] = [Uint];
////// Generated Code end   /////
