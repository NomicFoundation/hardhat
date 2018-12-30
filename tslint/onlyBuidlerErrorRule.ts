import path from "path";
import * as Lint from "tslint";
import { isThrowStatement } from "tsutils";
import * as ts from "typescript";

export class Rule extends Lint.Rules.TypedRule {
  public static metadata: Lint.IRuleMetadata = {
    ruleName: "only-buidler-error",
    description: "Enforces that only BuidlerError is thrown.",
    optionsDescription: "Not configurable.",
    options: null,
    type: "maintainability",
    typescriptOnly: true
  };

  public applyWithProgram(
    sourceFile: ts.SourceFile,
    program: ts.Program
  ): Lint.RuleFailure[] {
    const srcDir = path.normalize(__dirname + "/../src");
    if (!sourceFile.fileName.startsWith(srcDir)) {
      return [];
    }

    return this.applyWithFunction(
      sourceFile,
      walk,
      this.ruleArguments as string[],
      program.getTypeChecker()
    );
  }
}

function walk(ctx: Lint.WalkContext<string[]>, tc: ts.TypeChecker) {
  return ts.forEachChild(ctx.sourceFile, function cb(node): void {
    if (isThrowStatement(node)) {
      const expression = node.expression!;

      if (!isBuidlerError(expression, tc)) {
        ctx.addFailureAtNode(
          expression,
          "Only BuidlerError or derived classes must be thrown"
        );
      }
    }
    return ts.forEachChild(node, cb);
  });
}

function isBuidlerError(expression: ts.Expression, tc: ts.TypeChecker) {
  const exceptionType = tc.getTypeAtLocation(expression);
  if (!exceptionType.isClass()) {
    return false;
  }

  return exceptionType.symbol.getName() === "BuidlerError";
}
