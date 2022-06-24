import { Tx } from "../types";

import { Binding } from "./Binding";
import { CallOptions } from "./types";

export class CallBinding extends Binding<CallOptions, Tx> {}
