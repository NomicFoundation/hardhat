/**
 * Returns an object of node visitors that will call
 * 'visitor' with every discovered module path.
 *
 * Adapted from
 * https://github.com/import-js/eslint-plugin-import/blob/88dd8153571373151c3c7b508c5944cb2bba1588/utils/moduleVisitor.js
 *
 * @param  {Function(String)} visitor [description]
 * @param  {[type]} options [description]
 * @return {object}
 */
function visitModules(visitor) {
  // for import-y declarations
  function visitImportDeclaration(node) {
    // skip nodes that are not at the top level
    if (node.parent && node.parent.type !== "Program") {
      return;
    }

    // skip type imports
    // import type { Foo } (TS and Flow)
    const isTypeImport = node.importKind === "type";
    // import { type Foo } (Flow)
    const hasTypeSpecifiers =
      node.specifiers.length > 0 &&
      node.specifiers.every(({ importKind }) => importKind === "type");
    if (isTypeImport || hasTypeSpecifiers) {
      return;
    }

    visitor(node.source);
  }

  // for export declarations
  function visitExportDeclaration(node) {
    // skip nodes that are not at the top level
    if (node.parent && node.parent.type !== "Program") {
      return;
    }
    if (node.source === null || node.source.type !== "Literal") {
      return;
    }

    visitor(node.source);
  }

  // for CommonJS `require` calls
  // adapted from @mctep: https://git.io/v4rAu
  function visitCallExpression(call) {
    if (call.callee.type !== "Identifier") {
      return;
    }
    if (call.arguments.length !== 1) {
      return;
    }

    const modulePath = call.arguments[0];
    if (modulePath.type !== "Literal") {
      return;
    }
    if (typeof modulePath.value !== "string") {
      return;
    }

    visitor(modulePath);
  }

  const visitors = {
    ImportDeclaration: visitImportDeclaration,
    'Program > VariableDeclaration > VariableDeclarator > CallExpression[callee.name="require"]':
      visitCallExpression,
    'Program > ExpressionStatement > CallExpression[callee.name="require"]':
      visitCallExpression,
    ExportNamedDeclaration: visitExportDeclaration,
    ExportAllDeclaration: visitExportDeclaration,
  };

  return visitors;
}

module.exports = {
  visitModules,
};
