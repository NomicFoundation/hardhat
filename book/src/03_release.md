# Release

Releasing the [EDR NPM package](../../crates/edr_napi/package.json) is handled by the [EDR NPM release](../../.github/workflows/edr-npm-release.yml) GitHub Action workflow.

A new release is created automatically on commits to the `main` and `edr/main` branches that follow the following format: `edr-0.1.0` for releases or `edr-0.1.0-alpha.1` for pre-releases.

Prior to making such a commit, the version number in the [package.json](../../crates/edr_napi/package.json) of the main package and the platform-specific packages in the [npm](../../crates/edr_napi/npm) directory need to be manually adjusted.
