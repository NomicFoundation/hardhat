import "@nomicfoundation/hardhat-viem";

import "./types";

import { hardhatWaffleIncompatibilityCheck } from "./internal/hardhatWaffleIncompatibilityCheck";
import "./internal/add-chai-matchers";

hardhatWaffleIncompatibilityCheck();
