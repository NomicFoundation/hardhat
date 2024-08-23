import type {
  PrecompileMessageTrace,
  CreateMessageTrace,
  CallMessageTrace,
} from "@nomicfoundation/edr";

export { PrecompileMessageTrace, CreateMessageTrace, CallMessageTrace };

export type MessageTrace =
  | CreateMessageTrace
  | CallMessageTrace
  | PrecompileMessageTrace;
