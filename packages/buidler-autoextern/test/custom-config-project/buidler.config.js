require("../../src/index");

module.exports = {
    paths: {
        cache: __dirname + "/contracts/cache"
    },
    autoextern: {
        enableForFileAnnotation: "#another-annotation"
    }
};
