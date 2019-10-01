# Common problems

This section describes common problems with working with Buidler and how to solve them.

## Out of memory errors when compiling large projects

If your project has lots of smart contracts, compiling them may require more memory than what
Node allows by default and crash.

If you are experiencing this problem, you can use Buidler's `--max-memory` argument:

```sh
npx buidler --max-memory 4096 compile
```

If you find yourself using this all the time, you can set it with an environment variable in your `.bashrc`: `export BUIDLER_MAX_MEMORY=4096`.
