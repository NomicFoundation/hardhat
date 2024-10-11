const ANSI_ESCAPES_ESC = "\u001B[";
const ANSI_ESCAPES_CURSOR_HIDE = `${ANSI_ESCAPES_ESC}?25l`;
const ANSI_ESCAPES_CURSOR_PREV_LINE = `${ANSI_ESCAPES_ESC}F`;
const ANSI_ESCAPES_ERASE_END_LINE = `${ANSI_ESCAPES_ESC}K`;
const ANSI_ESCAPES_CURSOR_SHOW = `${ANSI_ESCAPES_ESC}?25h`;

export function printLine(line: string): void {
  console.log(line);
}

export function replaceLastLine(newLine: string): void {
  if (process.stdout.isTTY === true) {
    process.stdout.write(
      ANSI_ESCAPES_CURSOR_HIDE +
        ANSI_ESCAPES_CURSOR_PREV_LINE +
        newLine +
        ANSI_ESCAPES_ERASE_END_LINE +
        "\n" +
        ANSI_ESCAPES_CURSOR_SHOW,
    );
  } else {
    process.stdout.write(`${newLine}\n`);
  }
}
