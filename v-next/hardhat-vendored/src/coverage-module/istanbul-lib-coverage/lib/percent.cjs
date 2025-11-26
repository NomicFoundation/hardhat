// Contains code copied from istanbul-lib-coverage (https://github.com/istanbuljs/istanbuljs/tree/main/packages/istanbul-lib-coverage).
// The original license is in the LICENSE.txt file in the parent directory.

/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
"use strict";

module.exports = function percent(covered, total) {
  let tmp;
  if (total > 0) {
    tmp = (1000 * 100 * covered) / total;
    return Math.floor(tmp / 10) / 100;
  } else {
    return 100.0;
  }
};
