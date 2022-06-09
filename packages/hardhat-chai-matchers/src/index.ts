import "@nomiclabs/hardhat-ethers";
import { use } from "chai";
import chaiAsPromised from "chai-as-promised";

import "./types";

import { checkIfWaffleIsInstalled } from "./internal/checkIfWaffleIsInstalled";
import { hardhatChaiMatchers } from "./internal/hardhatChaiMatchers";

use(hardhatChaiMatchers);
use(chaiAsPromised);

checkIfWaffleIsInstalled();
