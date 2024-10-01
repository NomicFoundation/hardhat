# Templates

This directory contains `hardhat --init` templates. A template serves as a blueprint for initializing a new project.

Each template is a directory with a `package.json` file and other template files.

The `package.json` file contains the template's metadata. The following fields are used during project initialization:

- `description`: A short description of the template which is displayed to the user during template selection.
- `devDependencies`: The list of dependencies that should be installed in the project.
- `peerDependencies`: The list of dependencies that should also be installed in the project as dev dependencies if the used package manager does not install peer dependencies by default.

The other template files are copied to the project during project initialization.
