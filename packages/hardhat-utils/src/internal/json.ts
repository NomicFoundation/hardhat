// NOTE: We use the default import so that tests can mock getHeapStatistics.
import v8 from "node:v8";

/**
 * The heap needed per byte of JSON to parse it with `JSON.parse`.
 *
 * At its peak, `JSON.parse` holds both the whole text, as a single string, and
 * the objects it builds:
 * - V8 stores a string with 1 byte per character only if every character is
 *   in Latin-1, and otherwise with 2. Real-world JSON rarely qualifies: solc's
 *   output, for example, usually includes NatSpec comments, which can use
 *   characters like `’`, `→` or `—`. Each UTF-8 byte decodes to at most one
 *   character, so the string takes at most 2 bytes per byte of JSON.
 * - The objects add about 1.6 bytes per byte of JSON.
 *
 * Measured on real solc output (19 and 95 MB) as the smallest
 * `--max-old-space-size` the parse succeeds with, the peak was about 3.6 bytes
 * per byte, the worst of Node 22, 24 and 26. Rounded up.
 */
export const READ_HEAP_BYTES_PER_JSON_BYTE = 4;

/**
 * The heap needed per byte of JSON to serialize it with `JSON.stringify`.
 *
 * The objects already exist, so it's just the output string, at 2 bytes per
 * character (see above). Measured the same way on Node 22, 24 and 26, a
 * ~400M-character output needed exactly the string's size, with no extra
 * peak.
 */
export const WRITE_HEAP_BYTES_PER_JSON_BYTE = 2;

/**
 * Extra heap we require on top of our own allocation, for everything else that
 * needs it while that allocation is alive, like garbage collection and the
 * rest of the program, and to absorb small errors in the estimates above.
 *
 * It isn't measured: it's a cautious round number, small next to Node's
 * default heap limits (about 2 to 4 GiB, depending on the machine's memory).
 */
export const HEAP_MARGIN_BYTES: number = 256 * 1024 * 1024;

/**
 * Checks whether the heap can grow by `bytes`, plus a safety margin, before
 * reaching its limit.
 *
 * Running out of heap crashes the process, and can't be caught, so this must
 * be called right before the allocation. At each `await` in between, other
 * code can run and use memory.
 *
 * @param bytes The number of bytes about to be allocated in the heap.
 * @returns `true` if there's enough room for them.
 */
export function hasHeapHeadroomFor(bytes: number): boolean {
  // `total_available_size` counts garbage that hasn't been collected yet as
  // used, so this errs toward `false`, which is the safe direction.
  return (
    bytes + HEAP_MARGIN_BYTES <= v8.getHeapStatistics().total_available_size
  );
}
