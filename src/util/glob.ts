import util from "util";
import globModule from "glob";

export const glob = util.promisify(globModule);
export const globSync = globModule.sync.bind(globModule);
