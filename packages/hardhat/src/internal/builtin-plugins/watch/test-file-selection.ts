/**
 * Decides which test files a rerun of `hardhat test --watch` passes to the
 * `test` task. An empty list means "run every test".
 *
 * - When exactly one test file changed, only that file runs.
 * - When several test files changed at once (for example after formatting the
 *   whole project), every test runs.
 * - When only non-test files changed (for example a contract), the test files
 *   of the previous run run again.
 * - A rerun of everything (`--run-all`, or the user pressing "a") forgets the
 *   previous files.
 *
 * Selection is turned off when the user already chose the tests to run, with
 * test file arguments or `--grep`/`--grep-exclude`.
 */
export class TestFileSelection {
  readonly #enabled: boolean;
  #lastFiles: string[] = [];

  /**
   * @param enabled Whether to select test files at all. When false, `next`
   * always returns an empty list, so every rerun runs the command as the user
   * typed it.
   */
  constructor(enabled: boolean) {
    this.#enabled = enabled;
  }

  /**
   * Returns the test files for the next run.
   *
   * @param changedTestFiles The test files that were added or changed since
   * the last run.
   * @param removedFiles The files that were removed since the last run. They
   * are dropped from the previous selection.
   */
  public next(
    changedTestFiles: string[],
    removedFiles: string[] = [],
  ): string[] {
    if (!this.#enabled) {
      return [];
    }

    if (changedTestFiles.length === 1) {
      this.#lastFiles = [...changedTestFiles];
      return [...this.#lastFiles];
    }

    if (changedTestFiles.length > 1) {
      this.#lastFiles = [];
      return [];
    }

    const removed = new Set(removedFiles);
    this.#lastFiles = this.#lastFiles.filter((file) => !removed.has(file));

    return [...this.#lastFiles];
  }

  /**
   * Forgets the previous selection, so that the next run runs every test.
   */
  public reset(): void {
    this.#lastFiles = [];
  }
}
