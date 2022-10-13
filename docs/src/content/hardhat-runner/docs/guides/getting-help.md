# Getting help

Hardhat has a strong community of users willing to help you in times of trouble. Please read this entire guide to learn where and how to ask for help more effectively.

The first place to look for answers is the [GitHub Discussions section in the Hardhat repository.](https://github.com/NomicFoundation/hardhat) We recommend you search there first, as the answer may already exist.

If you can't find what you are looking for on GitHub Discussions, you can [create a new Discussion](https://github.com/NomicFoundation/hardhat/discussions/new).

If you didn't have any luck on GitHub, or if you prefer a real-time chat, you can join our [Discord Server](https://hardhat.org/discord). Please read its rules and ask for help in the right channel.

## Asking an effective question

To increase the chances of getting an answer quickly on GitHub Discussions and Discord, you need to make sure you write a good question first. To do so, you need to include:

1. A clear description of what you are trying to do.
2. The results you are getting, and how they differ from what you expect.
3. Which version of Hardhat you are running, and which plugins and their versions you are using.
4. Very specific and concise instructions on how to reproduce your problem. Ideally, provide a [minimal reproducible example](https://stackoverflow.com/help/minimal-reproducible-example). Another good option is to provide a link to a public repository that provides an easy environment to reproduce the problem.

## Reporting a bug

If you think you've found a bug in Hardhat, please [report it](https://github.com/NomicFoundation/hardhat/issues).

However, _before_ reporting a bug, please follow these steps to ensure that a new bug report is actually warranted:

1. Make sure you are using the latest version of Hardhat and its plugins. Your problem may already be fixed.
2. Try to determine whether the issue is coming from a plugin by running your project with some of them disabled. We only accept bug reports for plugins published by us, all of which start with either `@nomiclabs/` or `@nomicfoundation/`. If you find an issue with a plugin published by someone else, you may be able to raise it with that publisher.
3. Use the search on GitHub to try to find other reports of the same problem. If you find one, please comment on the existing issue instead of creating a new one.

Whenever reporting a bug, and ideally whenever commenting on an existing Issue, please include all the information described in [Asking an effective question](#asking-an-effective-question). By providing as much information as possible, you greatly increase the chances of your problem getting fixed quickly.
