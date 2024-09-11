import type { UnencryptedKeystoreFile } from "./types.js";
import type { ZodSchema } from "zod";

import { z } from "zod";

export const unencryptedKeystoreFileSchema: ZodSchema<UnencryptedKeystoreFile> =
  z.object({
    _format: z.literal("hh-unencrypted-keystore"),
    version: z.number(),
    keys: z.record(z.string()),
  });
