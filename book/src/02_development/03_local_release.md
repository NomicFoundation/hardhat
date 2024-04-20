# Local release

These are instructions for releasing the [EDR NPM package](../../crates/edr_napi/package.json) locally for debugging purposes.

1. Install and start [Verdaccio](./02_verdaccio.md).
2. Go to the [edr_napi](../../crates/edr_napi/) directory.
3. Run `pnpm build`.
4. Look for the NAPI binary that was built for your platform. It has the format `edr.<PLATFORM>.node`. For example on Apple Silicon Macs, it's called `edr.darwin-arm64.node`.
5. Move the NAPI binary to the appropriate platform-specific package in the [npm](../../crates/edr_napi/npm) directory. For example, on Apple Silicon Macs: `mv edr.darwin-arm64.node npm/darwin-arm64`.
6. Complete the Verdaccio [publish steps](./02_verdaccio.md#usage) in the [edr_napi](../../crates/edr_napi/) directory. You can ignore the warnings about not finding NAPI binaries for other platforms.
