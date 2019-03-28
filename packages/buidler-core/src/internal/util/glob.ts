import globModule from "glob";
import util from "util";

export const glob = util.promisify(globModule);
