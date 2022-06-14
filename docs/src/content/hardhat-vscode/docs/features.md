# Features

### Code Completions

**Hardhat for Visual Studio Code** autocompletes references to existing symbols (e.g. contract instances, globally available variables and built-in types like arrays) and import directives (i.e. it autocompletes the path to the imported file).

Direct imports (those not starting with `./` or `../`) are completed based on suggestions from `./node_modules`.

Relative imports pull their suggestions from the file system based on the current solidity file's location.

![Import completions](/hardhat-vscode-images/import-completion.gif "Import completions")

### Navigation

Move through your codebase with semantic navigation commands:

#### Go to Definition

Navigates to the definition of an identifier.

#### Go to Type Definition

Navigates to the type of an identifier.

#### Go to References

Shows all references of the identifier under the cursor.

![Navigation](/hardhat-vscode-images/navigation.gif "Navigation")

### Renames

Rename the identifier under the cursor and all of its references:

![Rename](/hardhat-vscode-images/rename.gif "Rename")

### Format document

Apply solidity formatting to the current document.

The formatting configuration can be overriden through a `.prettierrc` file, see [Formatting Configuration](#formatting-configuration).

![Reformat](/hardhat-vscode-images/format.gif "Reformat")

### Hover

Hovering the cursor over variables, function calls, errors and events will display a popup showing type and signature information:

![Hover](/hardhat-vscode-images/on-hover.gif "Hover")

### Inline code validation (Diagnostics)

As code is edited, **Hardhat for Visual Studio Code** runs the [solc](https://docs.soliditylang.org/en/latest/using-the-compiler.html) compiler over the changes and displays any warnings or errors it finds.

This feature is only available in solidity files that are part of a **Hardhat** project, as **Hardhat** is used for import resolution, see [Hardhat Projects](#hardhat-projects) for details.

![Diagnostic](/hardhat-vscode-images/diagnostic.gif "Diagnostic")

### Code Actions

Code actions, or quickfixes are refactorings suggested to resolve a [solc](https://docs.soliditylang.org/en/latest/using-the-compiler.html) warning or error.

A line with a warning/error that has a _code action_, will appear with small light bulb against it; clicking the light bulb will provide the option to trigger the _code action_.

#### Implement missing functions on interface

A contract that implements an interface, but is missing functions specified in the interface, will get a `solidity(3656)` error.

The matching code action _Add missing functions from interface_ will determine which functions need to be implemented to satisfy the interface and add them as stubs to the body of the contract.

![Implement interface](/hardhat-vscode-images/implement-interface.gif "Implement interface")

#### Constrain mutability

A function without a mutability keyword but which does not update contract state will show a `solidity(2018)` warning, with `solc` suggesting adding either the `view` or `pure` keyword depending on whether the function reads from state.

The matching code action _Add view/pure modifier to function declaration_ resolves the warning by adding the keyword to the function signature.

![Constrain Mutability](/hardhat-vscode-images/constrain-mutability.gif "Constrain Mutability")

#### Adding `virtual`/`override` on inherited function signature

A function in an inheriting contract, that has the same name and parameters as a function in the base contract, causes `solidity(4334)` in the base contract function if it does not have the `virtual` keyword and `solidity(9456)` in the inheriting contract function if does not have the `override` keyword.

The _Add virtual specifier to function definition_ and _Add override specifier to function definition_ code actions appear against functions with these errors.

![Virtual and Override](/hardhat-vscode-images/virtual-override.gif "Virtual and Override")

#### Adding `public`/`private` to function signature

A function without an accessibility keyword will cause the `solidity(4937)` error.

Two code actions will appear against a function with this error: _Add public visibility to declaration_ and _Add private visibility to declaration_.

![Public Private](/hardhat-vscode-images/public-private.gif "Public Private")
