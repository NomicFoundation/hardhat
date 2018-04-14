class ChainedError extends Error {
  constructor(msg, parentException) {
    super(msg);
    this.parentException = parentException;
  }
}

class InvalidConfigError extends ChainedError {}

class DownloadError extends ChainedError {}

class SourceFileNotFoundError extends ChainedError {}

class IllegalImportError extends ChainedError {}

class NotInProjectError extends ChainedError {}

module.exports = {
  ChainedError,
  InvalidConfigError,
  DownloadError,
  IllegalImportError,
  SourceFileNotFoundError,
  NotInProjectError
};
