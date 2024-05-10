/**
 * A description of a kind of error that Hardhat can throw.
 */
export interface ErrorDescriptor {
  /**
   * The error number, which should be unique.
   */
  number: number;

  /**
   * The id of the plugin that throws this error.
   */
  pluginId?: string;

  /**
   * A tempalte of the message of the error.
   *
   * This should be a short description. If possible, it should tell the user
   * how to solve their problem.
   *
   * @see The `applyErrorMessageTemplate` function.
   */
  messageTemplate: string;

  /**
   * `true` if this error should be reported
   */
  shouldBeReported?: true;

  /**
   * The title to use on the website section explaining this error, which can
   * use markdown.
   */
  websiteTitle: string;

  /**
   * The description to use on the website section explaining this error, which
   * can use markdown.
   */
  websiteDescription: string;
}

export const ERROR_CATEGORIES: {
  [categoryName: string]: {
    min: number;
    max: number;
    websiteTitle: string;
  };
} = {
  GENERAL: { min: 1, max: 99, websiteTitle: "General errors" },
  INTERNAL: { min: 100, max: 199, websiteTitle: "Internal Hardhat errors" },
};

export const ERRORS = {
  GENERAL: {
    NOT_INSIDE_PROJECT: {
      number: 1,
      messageTemplate: "You are not inside a Hardhat project.",
      websiteTitle: "You are not inside a Hardhat project",
      websiteDescription: `You are trying to run Hardhat outside of a Hardhat project.

You can learn how to use Hardhat by reading the [Getting Started guide](/hardhat-runner/docs/getting-started).`,
    },
  },
  INTERNAL: {
    ASSERTION_ERROR: {
      number: 100,
      messageTemplate: "An internal invariant was violated: %message%",
      websiteTitle: "Invariant violation",
      websiteDescription: `An internal invariant was violated. This is probably caused by a programming error in Hardhat or in one of the used plugins.

Please [report it](https://github.com/nomiclabs/hardhat/issues/new) to help us improve Hardhat.`,
      shouldBeReported: true,
    },
  },
} satisfies {
  [category in keyof typeof ERROR_CATEGORIES]: {
    [name: string]: ErrorDescriptor;
  };
};
