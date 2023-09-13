# Setup

## Dev Container

To make the developer experience as seamless and consistent as possible, we recommend using the VS Code [devcontainer](https://github.com/NomicFoundation/slang/tree/main/.devcontainer) included in this repository.
It is a light image that uses a script to install the minimum required tools to build this project.
If you are not familiar with containerized development, we recommend taking a look at [the official VS Code guide](https://code.visualstudio.com/docs/remote/containers).
Using a devcontainer allows us to quickly setup the environment and install different dependencies for different projects, without polluting the local environment.
In the future, it will enable us to include Windows and Mac OS specific images for cross-platform testing.

## Automated

If you would like to develop outside a container, you can use the automated setup method provided for your platform.

### Linux 

Run the `scripts/setup.sh` script.  This script is intended to be reused by the devcontainer and CI.

### MacOS

If you're using the [Homebrew](https://brew.sh/) package manager, run `brew bundle` from the repo root. This command will install the dependencies listed in the [`Brewfile`](../../../Brewfile).

## Manual

If you would like to set up the environment manually, you will need to install the following dependencies:

- Install Rust using [rustup](https://www.rust-lang.org/tools/install)
- [NodeJS 18](https://nodejs.org/en)
- [Yarn](https://yarnpkg.com/getting-started/install)
