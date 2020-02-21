export class ModulesLogger {
  private _logs: string[] = [];

  public log(message: string) {
    this._logs.push(message);
  }

  public clearLogs() {
    this._logs = [];
  }

  public getLogs(): string[] {
    return [...this._logs];
  }
}
