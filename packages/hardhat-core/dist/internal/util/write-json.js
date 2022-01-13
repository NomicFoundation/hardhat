"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeJson = void 0;
const fs_1 = require("fs");
const json_stream_stringify_1 = __importDefault(require("json-stream-stringify"));
async function writeJson(file, object, options) {
    const { replacer, spaces, encoding, flag, mode } = options;
    const jsonStream = new json_stream_stringify_1.default(object, replacer, spaces);
    const fsOptions = {
        flags: flag,
        encoding, mode
    };
    const f = (0, fs_1.createWriteStream)(file, fsOptions);
    jsonStream.once('error', () => console.log('Error in json-string-stream'));
    jsonStream.pipe(f);
    return new Promise((resolve, reject) => {
        f.on('finish', () => {
            f.close(err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(file);
                }
            });
        });
    });
}
exports.writeJson = writeJson;
//# sourceMappingURL=write-json.js.map