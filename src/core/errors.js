const util = require("util");

const ERROR_PREFIX = "BDLR";

class BuidlerError extends Error {
  constructor(errorDescription, parentError, ...messageArguments) {
    if (errorDescription === undefined || errorDescription instanceof Error) {
      parentError = errorDescription;
      errorDescription = ERRORS.INTERNAL_ERROR;
    }

    const hasParentError = parentError instanceof Error;

    if (parentError !== undefined && !hasParentError) {
      messageArguments.unshift(parentError);
    }

    const paddedNumber = errorDescription.number.toString().padStart(4, "0");
    const prefix = ERROR_PREFIX + paddedNumber + ": ";
    const formattedMessage = util.format(
      errorDescription.message,
      ...messageArguments
    );

    super(prefix + formattedMessage);

    if (hasParentError) {
      console.log(hasParentError);
      this.parent = parentError;
    }
  }
}

const ERRORS = {
  INTERNAL_ERROR: {
    number: 1,
    message: "An error occurred while creating this error, please report it."
  }
};

module.exports = { BuidlerError, ERRORS };
