// Contains code copied from istanbul-lib-report (https://github.com/istanbuljs/istanbuljs/tree/main/packages/istanbul-lib-report).
// The original license is in the LICENSE.txt file in the parent directory.

"use strict";
/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
module.exports = {
  getDefault() {
    return {
      statements: [50, 80],
      functions: [50, 80],
      branches: [50, 80],
      lines: [50, 80],
    };
  },
};
