/**
 * @fileoverview Enforce usage of dynamic imports for external modules
 * @author Nomic Foundation
 */
"use strict";
const fs = require("fs");
const { isBuiltin } = require("module");
const { relative } = require("eslint-module-utils/resolve");
const parse = require("eslint-module-utils/parse").default;
const visit = require("eslint-module-utils/visit").default;
const { visitModules } = require("../helpers/module-visitor");
const { isExternalModule } = require("../helpers/module-type");

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const traversed = new Set();

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: `problem`, // `problem`, `suggestion`, or `layout`
    docs: {
      description: "Enforce usage of dynamic imports for external modules",
      recommended: true,
      url: null, // URL to the documentation page for this rule
    },
    fixable: null, // Or `code` or `whitespace`
    schema: [
      {
        type: "object",
        properties: {
          ignoreModules: {
            type: "array",
            minItems: 0,
            items: { type: "string" },
            uniqueItems: true,
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      ENFORCE_DYNAMIC_IMPORT:
        "This import transitively imports the slow dependency '{{dependency}}' in file '{{filename}}' at line {{line}}",
      CANNOT_RESOLVE_MODULE:
        "Unable to resolve the absolute module path. This is likely an error in the rule configuration or the file paths.",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const ignoreModules = new Set(options.ignoreModules);

    function visitor(filename, originalNode, node) {
      const modulePath = node.value;
      if (ignoreModules.has(modulePath) || isBuiltin(modulePath)) {
        return;
      }

      function detectTopLevelExternalDependency(path) {
        // get the contents
        const content = fs.readFileSync(path, { encoding: "utf8" });

        // parse ast
        let ast, visitorKeys;
        try {
          const result = parse(path, content, context);
          ast = result.ast;
          visitorKeys = result.visitorKeys;
        } catch (err) {
          // can't continue
        }

        visit(
          ast,
          visitorKeys,
          visitModules((node) => visitor(path, originalNode, node))
        );
      }

      if (!isExternalModule(modulePath)) {
        const absoluteModulePath = relative(
          modulePath,
          filename,
          context.settings
        );

        if (!absoluteModulePath) {
          context.report({
            node: originalNode,
            messageId: "CANNOT_RESOLVE_MODULE",
          });
          return;
        }

        if (traversed.has(absoluteModulePath)) {
          return;
        }

        traversed.add(absoluteModulePath);
        detectTopLevelExternalDependency(absoluteModulePath);
      } else {
        context.report({
          node: originalNode,
          messageId: "ENFORCE_DYNAMIC_IMPORT",
          data: {
            dependency: modulePath,
            filename,
            line: node.loc.start.line,
          },
        });
      }
    }

    return visitModules((node) => visitor(context.filename, node, node));
  },
};
