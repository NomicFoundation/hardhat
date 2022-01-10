import { createWriteStream } from 'fs';
import JsonStreamStringify from 'json-stream-stringify';

export interface Options {
    encoding?: string;
    flag?: string;
    mode?: number;
    replacer?: any;
    spaces?: number | string;
}

export async function writeJson(file: string, object: object, options: Options) {
    const { replacer, spaces, encoding, flag, mode } = options;
    const jsonStream = new JsonStreamStringify(object, replacer, spaces);

    const fsOptions = {
        flags: flag,
        encoding, mode
    };
    const f = createWriteStream(file, fsOptions);

    jsonStream.pipe(f);
}
