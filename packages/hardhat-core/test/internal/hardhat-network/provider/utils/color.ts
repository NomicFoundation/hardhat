import { Chalk } from "chalk";
import { isEdrProvider } from "../../helpers/isEdrProvider";
import { EthereumProvider } from "../../../../../src/types";

export function ansiColor(
  provider: EthereumProvider,
  text: string,
  color: Chalk
): string {
  const formatted = color(text);

  if (isEdrProvider(provider)) {
    // EDR's ansi console crate uses the RESET code to reset the color
    return formatted.replace("\x1B[39m", "\x1B[0m");
  } else {
    return formatted;
  }
}
