import type {
  PrecompileMessageTrace,
  CreateMessageTrace,
  CallMessageTrace,
} from "@ignored/edr-optimism";

export type { PrecompileMessageTrace, CreateMessageTrace, CallMessageTrace };

export type MessageTrace =
  | CreateMessageTrace
  | CallMessageTrace
  | PrecompileMessageTrace;
