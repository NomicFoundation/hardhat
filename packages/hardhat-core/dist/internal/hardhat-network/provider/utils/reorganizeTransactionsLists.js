"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorganizeTransactionsLists = void 0;
const errors_1 = require("../../../core/providers/errors");
/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/**
 * Move as many transactions as possible from the queued list
 * to the pending list.
 *
 * Returns the new lists and the new executable nonce of the sender.
 */
function reorganizeTransactionsLists(pending, queued, retrieveNonce) {
    let newPending = pending;
    let newQueued = queued.sortBy(retrieveNonce, (l, r) => l.cmp(r));
    if (pending.last() === undefined) {
        throw new errors_1.InternalError("Pending list cannot be empty");
    }
    const nextPendingNonce = retrieveNonce(pending.last()).addn(1);
    let movedCount = 0;
    for (const queuedTx of newQueued) {
        const queuedTxNonce = retrieveNonce(queuedTx);
        if (nextPendingNonce.eq(queuedTxNonce)) {
            newPending = newPending.push(queuedTx);
            nextPendingNonce.iaddn(1);
            movedCount++;
        }
        else {
            break;
        }
    }
    newQueued = newQueued.skip(movedCount);
    return {
        newPending,
        newQueued,
    };
}
exports.reorganizeTransactionsLists = reorganizeTransactionsLists;
//# sourceMappingURL=reorganizeTransactionsLists.js.map