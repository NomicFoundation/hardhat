"use strict";

const types = require("../types");

const BUIDLER_PARAM_DEFINITIONS = {
  network: {
    name: "network",
    defaultValue: "auto",
    description:
      "The network to connect to. See buidler's config documentation for more info.",
    type: types.string
  }
};

module.exports = {
  BUIDLER_PARAM_DEFINITIONS
};
