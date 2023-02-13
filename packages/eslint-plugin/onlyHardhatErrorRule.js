const { ESLintUtils } = require("@typescript-eslint/experimental-utils");

function onlyHardhatErrorRule(context) {
  const parserServices = ESLintUtils.getParserServices(context);
  const checker = parserServices.program.getTypeChecker();

  return {
    ThrowStatement(node) {
      const expression = parserServices.esTreeNodeToTSNodeMap.get(
        node.argument
      );

      if (!isHardhatError(expression, checker)) {
        const exceptionName = getExpressionClassName(expression, checker);

        context.report({
          node,
          message: `Only HardhatError must be thrown, ${exceptionName} found.`,
        });
      }
    },
  };
}

function onlyHardhatPluginErrorRule(context) {
  const parserServices = ESLintUtils.getParserServices(context);
  const checker = parserServices.program.getTypeChecker();

  return {
    ThrowStatement(node) {
      const expression = parserServices.esTreeNodeToTSNodeMap.get(
        node.argument
      );

      if (!isHardhatPluginError(expression, checker)) {
        const exceptionName = getExpressionClassName(expression, checker);

        context.report({
          node,
          message: `Only HardhatPluginError must be thrown, ${exceptionName} found.`,
        });
      }
    },
  };
}

function getExpressionClassName(expression, tc) {
  const exceptionType = tc.getTypeAtLocation(expression);

  if (exceptionType.symbol === undefined) {
    return "[UNKNOWN EXCEPTION TYPE]";
  }

  return exceptionType.symbol.getName();
}

function getExpressionClassNameAndBaseClass(expression, tc) {
  const exceptionType = tc.getTypeAtLocation(expression);

  if (exceptionType.symbol === undefined) {
    return ["[UNKNOWN EXCEPTION TYPE]"];
  }

  const className = exceptionType.symbol.getName();
  const baseClass =
    exceptionType.resolvedBaseConstructorType?.symbol?.getName() ??
    "[UNKNOWN BASE CLASS]";

  return [className, baseClass];
}

function isHardhatError(expression, tc) {
  return getExpressionClassName(expression, tc) === "HardhatError";
}

function isHardhatPluginError(expression, tc) {
  return getExpressionClassNameAndBaseClass(expression, tc).includes(
    "HardhatPluginError"
  );
}

module.exports = { onlyHardhatErrorRule, onlyHardhatPluginErrorRule };
