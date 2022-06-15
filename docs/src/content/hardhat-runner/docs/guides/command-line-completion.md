# Command-line completion

Hardhat has a companion npm package that acts as a shorthand for `npx hardhat`, and at the same time, it enables command-line completions in your terminal.

This package, `hardhat-shorthand`, installs a globally accessible binary called `hh` that runs your locally installed `hardhat`.

## Installation

To use the Hardhat shorthand you need to install it **globally**:

```
npm install --global hardhat-shorthand
```

After doing this running `hh` will be equivalent to running `npx hardhat`. For example, instead of running `npx hardhat compile` you can run `hh compile`.

### Installing the command-line completions

To enable autocomplete support you'll also need to install the shell completion script using `hardhat-completion`, which comes with `hardhat-shorthand`. Run `hardhat-completion install` and follow the instructions to install the completion script:

```
$ hardhat-completion install
✔ Which Shell do you use ? · zsh
✔ We will install completion to ~/.zshrc, is it ok ? (y/N) · true
=> Added tabtab source line in "~/.zshrc" file
=> Added tabtab source line in "~/.config/tabtab/zsh/__tabtab.zsh" file
=> Wrote completion script to /home/fvictorio/.config/tabtab/zsh/hh.zsh file

      => Tabtab source line added to ~/.zshrc for hh package.

      Make sure to reload your SHELL.
```

To try it out, open a **new** terminal, go to the directory of your Hardhat project, and try typing `hh` followed by tab:

![](/hh.gif)

## Context

Out of best practice, Hardhat projects use a local installation of the npm package `hardhat` to make sure everyone working on the project is using the same version. This is why you need to use `npx` or npm scripts to run Hardhat.

This approach has the downside of there being no way to provide autocomplete suggestions directly for the `hardhat` command, as well as making the CLI commands longer. These are the two issues that `hh` solves.

## Troubleshooting

### "Autocompletion is not working"

First, make sure you installed the autocompletion script with `hardhat-completion install`, then either reload your shell or open a new terminal to try again.

If you still have problems, make sure that your Hardhat config doesn't have any issues. You can do this by just running `hh`. If the command prints the help message, then your config is fine. If not, you'll see what the problem is.
