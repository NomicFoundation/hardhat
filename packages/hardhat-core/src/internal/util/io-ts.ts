import * as t from "io-ts";

export function optional<TypeT, OutputT, InputT>(
  codec: t.Type<TypeT, OutputT, InputT>,
  name: string = `${codec.name} | undefined`
): t.Type<TypeT | undefined, OutputT | undefined, InputT | undefined> {
  return new t.Type(
    name,
    (u: unknown): u is TypeT | undefined => u === undefined || codec.is(u),
    (u, c) => (u === undefined ? t.success(undefined) : codec.validate(u, c)),
    (a) => (a === undefined ? undefined : codec.encode(a))
  );
}

export function nullable<TypeT, OutputT, InputT>(
  codec: t.Type<TypeT, OutputT, InputT>,
  name: string = `${codec.name} | null`
): t.Type<TypeT | null, OutputT | null, InputT | null> {
  return new t.Type(
    name,
    (u: unknown): u is TypeT | null => u === null || codec.is(u),
    (u, c) => (u === null ? t.success(null) : codec.validate(u, c)),
    (a) => (a === null ? null : codec.encode(a))
  );
}
