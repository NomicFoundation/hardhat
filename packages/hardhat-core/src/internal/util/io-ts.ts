import * as t from "io-ts";

export function optional<TypeT, OutputT>(
  codec: t.Type<TypeT, OutputT, unknown>,
  name: string = `${codec.name} | undefined`
): t.Type<TypeT | undefined, OutputT | undefined, unknown> {
  return new t.Type(
    name,
    (u: unknown): u is TypeT | undefined => u === undefined || codec.is(u),
    (u, c) => (u === undefined ? t.success(u) : codec.validate(u, c)),
    (a) => (a === undefined ? undefined : codec.encode(a))
  );
}

export const nullable = <T>(codec: t.Type<T>) =>
  new t.Type<T | null>(
    `${codec.name} or null`,
    (input): input is T | null =>
      input === null || input === undefined || codec.is(input),
    (input, context) => {
      if (input === null || input === undefined) {
        return t.success(null);
      }
      return codec.validate(input, context);
    },
    t.identity
  );
