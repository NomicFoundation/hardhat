"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDifferenceInSeconds = exports.dateToTimestampSeconds = exports.parseDateString = void 0;
function parseDateString(str) {
    return new Date(str);
}
exports.parseDateString = parseDateString;
function dateToTimestampSeconds(date) {
    return Math.floor(date.valueOf() / 1000);
}
exports.dateToTimestampSeconds = dateToTimestampSeconds;
function getDifferenceInSeconds(a, b) {
    return Math.floor((a.valueOf() - b.valueOf()) / 1000);
}
exports.getDifferenceInSeconds = getDifferenceInSeconds;
//# sourceMappingURL=date.js.map