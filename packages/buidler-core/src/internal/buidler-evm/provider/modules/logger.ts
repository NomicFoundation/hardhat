import util from "util";

export class ModulesLogger {
  private _logs: Array<string | [string, string]> = [];
  private _titleLength = 0;

  public log(message: string) {
    this._logs.push(message);
  }

  public logWithTitle(title: string, message: string) {
    // We always use the max title length we've seen. Otherwise the value move
    // a lot with each tx/call.
    if (title.length > this._titleLength) {
      this._titleLength = title.length;
    }

    this._logs.push([title, message]);
  }

  public debug(...args: any[]) {
    this.log(util.format(args[0], ...args.splice(1)));
  }

  public clearLogs() {
    this._logs = [];
  }

  public hasLogs(): boolean {
    return this._logs.length > 0;
  }

  public getLogs(): string[] {
    return this._logs.map((l) => {
      if (typeof l === "string") {
        return l;
      }

      const title = `${l[0]}:`;

      return `${title.padEnd(this._titleLength + 1)} ${l[1]}`;
    });
  }
}
