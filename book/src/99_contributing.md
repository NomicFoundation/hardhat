# Contributing

When contributing to the book, please make sure to only put one sentence per line, to simplify git diffs.

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org) convention for commit messages.

> The Conventional Commits specification is a lightweight convention on top of commit messages.
> It provides an easy set of rules for creating an explicit commit history; which makes it easier to write automated tools on top of.

## Pull Requests

When merging a pull request to `edr/main`, we employ the "squash and merge" strategy.
By default, the generated commit header will reuse the pull request's title.
To this end, make sure to use the Conventional Commits convention for the pull request title as well.

### Merging

When your pull request has been approved, ensure that the generated commit body is compliant with the Conventional Commits convention before merging.
This includes ensuring that any work-in-progress commit messages are removed.
Mentions of co-authors should be retained.

For example:

```bash
# Commit description
feat: allow provided config object to extend other configs

# Commit body
BREAKING CHANGE: `extends` key in config file is now used for extending other config files

---------

Co-authored-by: Wodann <Wodann@users.noreply.github.com>
```
