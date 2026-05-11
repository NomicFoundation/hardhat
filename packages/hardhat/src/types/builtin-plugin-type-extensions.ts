// This is an internal file that needs to be imported by every top-level type
// file, so that they load the builtin plugin type extensions.
//
// The trade-off here is that we end up with one unnecessary runtime import of
// an empty file (this one) if a `src/types/*` file is imported without the
// `type` annotation (e.g. the CLI's indirectly importing task-related enums),
// in exchange for better DX.
//
// The reason we can't just use the `export type *` from the other files instead
// is that in some cases that leads to a circular export of types that TS can't
// handle.
//
// The reason we can't use `import type` is that those get erased during
// compilation.
export type * from "../internal/builtin-plugins/index.js";
