import { Tx } from "../types";

import { Future } from "./Future";
import { CallOptions } from "./types";

export class CallFuture extends Future<CallOptions, Tx> {}
