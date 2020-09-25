export type Callback<T = void> = ((error: NonNullable<any>) => void) &
  ((error: null | undefined, value: T) => void);
