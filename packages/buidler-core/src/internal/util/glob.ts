import globModule from "glob";
import util from "util";

export const glob = util.promisify(globModule);

export const globSync = globModule.sync;
