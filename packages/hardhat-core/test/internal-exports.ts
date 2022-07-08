// Our own packages might use internal stuff. This file tests that those things
// are available to prevent moving them.

/* eslint-disable @typescript-eslint/no-unused-vars */

// used by the `reset` hardhat network helper
import { RpcForkConfig } from "../src/internal/core/jsonrpc/types/input/hardhat-network";
