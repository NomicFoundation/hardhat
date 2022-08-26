export class ScopeStack {
  private scopes: string[];

  constructor() {
    this.scopes = [];
  }

  public push(scopeName: string): void {
    this.scopes.push(scopeName);
  }

  public pop(): string | undefined {
    return this.scopes.pop();
  }

  public getScopedLabel() {
    return this.scopes.join("/");
  }
}
