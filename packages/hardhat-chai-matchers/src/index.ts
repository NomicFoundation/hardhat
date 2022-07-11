import "@nomiclabs/hardhat-ethers";

import "./types";

import { checkIfWaffleIsInstalled } from "./internal/checkIfWaffleIsInstalled";
import "./internal/add-chai-matchers";

checkIfWaffleIsInstalled();
