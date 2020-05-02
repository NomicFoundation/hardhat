import { join } from "path";

import { getConfigDir } from "./user-dirs";

export default join(getConfigDir(), "config.json");
