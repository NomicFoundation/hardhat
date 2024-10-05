import ansiEscapes from "ansi-escapes";

export function printLine(line: string): void {
  console.log(line);
}

export function replaceLastLine(newLine: string): void {
  if (process.stdout.isTTY === true) {
    process.stdout.write(
      ansiEscapes.cursorHide +
        ansiEscapes.cursorPrevLine +
        newLine +
        ansiEscapes.eraseEndLine +
        "\n" +
        ansiEscapes.cursorShow,
    );
  } else {
    process.stdout.write(`${newLine}\n`);
  }
}
