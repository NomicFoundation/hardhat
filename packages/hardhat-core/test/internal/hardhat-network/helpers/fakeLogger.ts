export class FakeModulesLogger {
  public lines: string[] = [];

  public printLineFn(): (line: string) => void {
    return (line) => {
      this.lines.push(line);
    };
  }

  public replaceLastLineFn(): (line: string) => void {
    return (line) => {
      this.lines[this.lines.length - 1] = line;
    };
  }

  public getOutput(): string {
    return this.lines.join("\n");
  }

  public reset() {
    this.lines = [];
  }
}
