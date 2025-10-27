"use strict";
/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
const path = require("node:path");
module.exports = {
    create(name, cfg) {
        cfg = cfg || {};
        let Cons;
        try {
            Cons = require(path.join(__dirname, "lib", name, "index.cjs"));
        }
        catch (e) {
            if (e.code !== "MODULE_NOT_FOUND") {
                throw e;
            }
            Cons = require(name);
        }
        return new Cons(cfg);
    },
};
//# sourceMappingURL=index.cjs.map