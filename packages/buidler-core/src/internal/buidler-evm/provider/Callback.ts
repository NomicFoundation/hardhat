export type Callback<T = void> = T extends void
  ? (error: any) => void
  : (error: any, value: T) => void;
