"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.txMapToArray = void 0;
const flatten_1 = __importDefault(require("lodash/flatten"));
function txMapToArray(transactions) {
    return (0, flatten_1.default)(Array.from(transactions.values())).map((tx) => tx.data);
}
exports.txMapToArray = txMapToArray;
//# sourceMappingURL=txMapToArray.js.map