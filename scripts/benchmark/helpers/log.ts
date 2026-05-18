import { styleText } from "node:util";

const PREFIX = "[bench]";

export const fmt = {
  pkg: (name: string) => styleText("bold", name),
  version: (v: string) => styleText("green", v),
  deemphasize: (text: string) => styleText("dim", text),
  success: (text: string) => styleText("green", text),
  fail: (text: string) => styleText("red", text),
};

export function log(msg: string): void {
  console.log(`${styleText("cyan", PREFIX)} ${msg}`);
}

export function logStep(step: string): void {
  console.log(styleText(["bold", "yellow"], `${PREFIX} === ${step} ===`));
}

export function logWarning(msg: string): void {
  console.warn(styleText("yellow", `${PREFIX} Warning: ${msg}`));
}

export function logError(msg: string): void {
  console.error(styleText("red", `${PREFIX} Error: ${msg}`));
}
