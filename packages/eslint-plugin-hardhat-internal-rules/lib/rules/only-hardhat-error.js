/**
 * @fileoverview Enforces that only HardhatError is thrown.
 * @author Nomic Foundation
 */
"use strict";

const { ESLintUtils } = require("@typescript-eslint/utils");
const { getExpressionClassName } = require("../helpers/expression-checker");

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforces that only HardhatError is thrown.",
      recommended: true,
      url: null, // URL to the documentation page for this rule
    },
    fixable: null, // Or `code` or `whitespace`
    schema: [], // Add a schema if the rule has options
    messages: {
      ONLY_HARDHAT_ERROR:
        "Only HardhatError must be thrown, {{exceptionName}} found.",
    },
  },

  create(context) {
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
            messageId: "ONLY_HARDHAT_ERROR",
            data: {
              exceptionName,
            },
          });
        }
      },
    };
  },
};

function isHardhatError(expression, typeChecker) {
  return getExpressionClassName(expression, typeChecker) === "HardhatError";
}
