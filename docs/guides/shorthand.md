# Shorthand and autocomplete

Hardhat projects use a locally installed version of `hardhat` to make sure everyone working on the project is using the
same version. This is good practice, but it also means that you need to use `npx` or npm scripts to use the Hardhat
binary. For example, to compile your contracts you need to do `npx hardhat compile`, which is cumbersome. Plus, using
the binary this way means that there's no way for us to provide autocomplete suggestions when you are typing the
command.

To solve both of these problems we created `@nomiclabs/hardhat-shorthand`, which installs a globally accessible binary
called `hh` that saves you precious keystrokes and has support for shell autocompletion.

## Installation

To use the Hardhat shorthand you need to install it _globally_:

```
npm i -g @nomiclabs/hardhat-shorthand
```

This will install an `hh` binary that you can use as a replacement of `npx hardhat`. For example, instead of doing
`npx hardhat compile` you can run `hh compile`.

To enable autocomplete support you'll also need to install the shell completion script. This is done with
`hardhat-completion`, the other binary that gets installed with the shorthand package. Run this command and follow the
instructions to install the completion script:

```
hardhat-completion install
```

To try it out, open a **new** terminal, go to the directory of your Hardhat project, and do:

```
hh <tab>
```

If everything is working fine, you'll see the list of available tasks in your project.

## Troubleshooting

### "Autocompletion is not working"

First, make sure you installed the autocompletion script with `hardhat-completion install`. Then, open a new terminal
and go to your hardhat project.

If you still have problems, make sure that your Hardhat config doesn't have any issues. You can do this by just running
`hh` without any task. If the command prints the help info, then your config is fine. If not, you'll see what's the
problem.
