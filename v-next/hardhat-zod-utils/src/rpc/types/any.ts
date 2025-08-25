import type { ZodType } from "zod";

import { z } from "zod";

export const rpcAny: ZodType<any> = z.any();
