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

module.exports = {
  getExpressionClassName,
  getExpressionClassNameAndBaseClass,
};
