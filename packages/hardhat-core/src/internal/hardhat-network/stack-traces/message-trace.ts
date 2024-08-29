import type {
  PrecompileMessageTrace,
  CreateMessageTrace,
  CallMessageTrace,
} from "@nomicfoundation/edr";

export type { PrecompileMessageTrace, CreateMessageTrace, CallMessageTrace };

export type MessageTrace =
  | CreateMessageTrace
  | CallMessageTrace
  | PrecompileMessageTrace;
