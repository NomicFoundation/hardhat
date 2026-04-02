# Templates

This directory contains `hardhat --init` templates. A template serves as a blueprint for initializing a new project.

Each template is a directory with a `package.json` file and other template files.

The `package.json` file contains the template's metadata. The following fields are used during project initialization:

- `description`: A short description of the template which is displayed to the user during template selection.
- `devDependencies`: The list of dependencies that should be installed in the project.
- `peerDependencies`: The list of dependencies that should also be installed in the project as dev dependencies if the used package manager does not install peer dependencies by default.

Note that the `workspace:` prefix is stripped from the version of the template dependencies during project initialization.

The other template files are copied to the project during project initialization.

#### .gitignore files

Due to a limitation in npm, `.gitignore` files are always ignored during project packing/publishing (see https://github.com/npm/npm/issues/3763).

To work around this, we use the following convention:

- if a template file is named `gitignore`, it is copied to the project workspace as `.gitignore`;
- if a template file is named `.gitignore`, it is ignored during the project initialization (this should only affect local development, or future versions of `npm` if the aforementioned issue is resolved).
