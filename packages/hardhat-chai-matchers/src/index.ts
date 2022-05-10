import { use } from "chai";
import chaiAsPromised from "chai-as-promised";

import { hardhatChaiMatchers } from "./hardhatChaiMatchers";

use(hardhatChaiMatchers);
use(chaiAsPromised);
