"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyWorkaround = void 0;
/**
 * This function applies a workaround to an ANTLR issue that arises when used
 * with Immutable.js.
 *
 * ANTLR defines String.prototype.hashCode, and Immutable.js uses hashCode
 * functions internally (for equality), including on strings.
 *
 * If the parser is required lazily (which it normally is) in the middle of an
 * execution, the custom state managers can break, because we'd be redefining
 * the String's equality function as seen by Immutable.js.
 *
 * By always including the parser we make the equality function's definition
 * stable during the entire execution.
 */
function applyWorkaround() {
    require("@solidity-parser/parser");
}
exports.applyWorkaround = applyWorkaround;
//# sourceMappingURL=antlr-prototype-pollution-workaround.js.map