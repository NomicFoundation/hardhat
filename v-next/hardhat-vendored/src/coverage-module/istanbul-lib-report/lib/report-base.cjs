// Contains code copied from istanbul-lib-report (https://github.com/istanbuljs/istanbuljs/tree/main/packages/istanbul-lib-report).
// The link to the original license is in the VENDORED.md file in the parent directory.

"use strict";

// TODO: switch to class private field when targeting node.js 12
const _summarizer = Symbol("ReportBase.#summarizer");

class ReportBase {
  constructor(opts = {}) {
    this[_summarizer] = opts.summarizer;
  }

  execute(context) {
    context.getTree(this[_summarizer]).visit(this, context);
  }
}

module.exports = ReportBase;
