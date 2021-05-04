import { ModulesLogger } from "../../../../src/internal/hardhat-network/provider/modules/logger";

export class FakeModulesLogger extends ModulesLogger {
  public lines: string[] = [];

  constructor(enabled: boolean) {
    super(
      enabled,
      (line) => {
        this.lines.push(line);
      },
      (line) => {
        this.lines[this.lines.length - 1] = line;
      }
    );
  }

  public getOutput(): string {
    return this.lines.join("\n");
  }

  public reset() {
    this.lines = [];
  }
}
