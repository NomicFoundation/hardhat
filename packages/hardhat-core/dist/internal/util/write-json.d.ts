export interface Options {
    encoding?: string;
    flag?: string;
    mode?: number;
    replacer?: any;
    spaces?: number | string;
}
export declare function writeJson(file: string, object: object, options: Options): Promise<unknown>;
//# sourceMappingURL=write-json.d.ts.map