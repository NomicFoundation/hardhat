/**
 * Formats a multiline string to make appear closer to the command line
 * when inside a test file. The first line is ignored, and the whitespace
 * at the start of the line is removed.
 */
export function testFormat(expected: string): string {
  const lines = expected
    .toString()
    .substring(1) // Remove the first newline
    .split("\n");

  // calculate the length of the whitespace prefix based on the first line
  const whitespacePrefixLength = lines[0].search(/\S/);

  return lines
    .map((line) => line.substring(whitespacePrefixLength)) // strip prefix whitespace
    .join("\n");
}
