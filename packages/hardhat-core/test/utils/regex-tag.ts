import _ from "lodash";

/**
 * Template literal tag function to construct a regular expression where
 * most of it is just literal text and some places have to be regexes.
 *
 * See `flatten.ts` tests to see how is used.
 */
export function regexTag(
  literals: TemplateStringsArray,
  ...placeholders: string[]
): RegExp {
  let result = "";

  for (let i = 0; i < placeholders.length; i++) {
    result += _.escapeRegExp(literals[i]);
    result += placeholders[i];
  }

  result += _.escapeRegExp(literals[literals.length - 1]);

  return new RegExp(result);
}
