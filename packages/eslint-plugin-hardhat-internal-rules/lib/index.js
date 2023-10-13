/**
 * @fileoverview This plugin contains internal linting rules used in the [Hardhat repository](https://github.com/nomiclabs/hardhat/). It&#39;s not meant to be used by other projects.
 * @author Nomic Foundation
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const requireIndex = require("requireindex");

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

// import all rules in lib/rules
module.exports.rules = requireIndex(__dirname + "/rules");
