# Peer dependency with the wrong version

This is part of the plugin validation tests. We have checked in a `node_modules` folder to simulate an installed `example` package with an installed set of peer dependencies: `peer1` and `peer2`. However `peer2@2.0.0` is outside the version range of `^1.0.0` in `example`.
