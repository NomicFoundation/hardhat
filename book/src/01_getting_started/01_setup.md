# Setup

## Dev Container

To make the developer experience as seamless and consistent as possible, we recommend using the VS Code [devcontainer](https://github.com/NomicFoundation/slang/tree/main/.devcontainer) included in this repository.
It is a light image that uses a script to install the minimum required tools to build this project.
If you are not familiar with containerized development, we recommend taking a look at [the official VS Code guide](https://code.visualstudio.com/docs/remote/containers).
Using a devcontainer allows us to quickly setup the environment and install different dependencies for different projects, without polluting the local environment.
In the future, it will enable us to include Windows and Mac OS specific images for cross-platform testing.

## Scripts

If you would like to develop outside a container, you can use the `scripts/setup.sh` script (on Linux).
This script is intended to be reused by the devcontainer and CI.
