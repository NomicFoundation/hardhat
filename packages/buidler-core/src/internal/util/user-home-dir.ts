import { homedir } from "os";
import { resolve } from "path";

import ROOT_USER from "./root-user";

export const home = homedir();

export default ROOT_USER ? resolve("usr/local/share") : home;
