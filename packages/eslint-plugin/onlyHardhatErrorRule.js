const { ESLintUtils } = require("@typescript-eslint/experimental-utils");

function onlyHardhatErrorRule(context) {
  const parserServices = ESLintUtils.getParserServices(context)
  const checker = parserServices.program.getTypeChecker();

  return {
    ThrowStatement(node) {
      const expression = parserServices.esTreeNodeToTSNodeMap.get(node.argument);

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

function getExpressionClassName(expression, tc) {
  const exceptionType = tc.getTypeAtLocation(expression);

  if (exceptionType.symbol === undefined) {
    return "[UNKNOWN EXCEPTION TYPE]";
  }

  return exceptionType.symbol.getName();
}

function isHardhatError(expression, tc) {
  return getExpressionClassName(expression, tc) === "HardhatError";
}

module.exports = { onlyHardhatErrorRule }
