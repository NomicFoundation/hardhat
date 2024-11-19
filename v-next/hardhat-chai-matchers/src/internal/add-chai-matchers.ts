import { use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { hardhatChaiMatchers } from "./hardhatChaiMatchers.js";

use(hardhatChaiMatchers);
use(chaiAsPromised);
