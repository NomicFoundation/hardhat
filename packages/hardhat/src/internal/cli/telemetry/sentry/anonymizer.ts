import type {
  Envelope,
  Event,
  EventItem,
  Exception,
  StackFrame,
  Stacktrace,
} from "@sentry/core";

import * as path from "node:path";

// This file is executed in a subprocess, and it is always run in this context.
// Therefore, it is acceptable to avoid using dynamic imports and instead import all necessary modules at the beginning.
import * as czech from "ethereum-cryptography/bip39/wordlists/czech.js";
import * as english from "ethereum-cryptography/bip39/wordlists/english.js";
import * as french from "ethereum-cryptography/bip39/wordlists/french.js";
import * as italian from "ethereum-cryptography/bip39/wordlists/italian.js";
import * as japanese from "ethereum-cryptography/bip39/wordlists/japanese.js";
import * as korean from "ethereum-cryptography/bip39/wordlists/korean.js";
import * as simplifiedChinese from "ethereum-cryptography/bip39/wordlists/simplified-chinese.js";
import * as SPANISH from "ethereum-cryptography/bip39/wordlists/spanish.js";
import * as traditionalChinese from "ethereum-cryptography/bip39/wordlists/traditional-chinese.js";

import { ANONYMIZED_PATH, anonymizeUserPaths } from "./anonymize-paths.js";
import { GENERIC_SERVER_NAME } from "./constants.js";

interface WordMatch {
  index: number;
  word: string;
}

export type AnonymizeEnvelopeResult =
  | { success: true; envelope: Envelope }
  | { success: false; error: string };

export type AnonymizeEventResult =
  | { success: true; event: Event }
  | { success: false; error: string };

const ANONYMIZED_MNEMONIC = "<mnemonic>";
const MNEMONIC_PHRASE_LENGTH_THRESHOLD = 7;
const MINIMUM_AMOUNT_OF_WORDS_TO_ANONYMIZE = 4;

export class Anonymizer {
  readonly #configPath?: string;

  constructor(configPath?: string) {
    this.#configPath = configPath;
  }

  /**
   * Anonymizes the events in the envelope in place, modifying the envelope.
   */
  public async anonymizeEventsFromEnvelope(
    envelope: Envelope,
  ): Promise<AnonymizeEnvelopeResult> {
    for (const item of envelope[1]) {
      if (item[0].type === "event") {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- We know that the item is an event item */
        const eventItem = item as EventItem;

        const anonymizedEvent = await this.anonymizeEvent(eventItem[1]);
        if (anonymizedEvent.success) {
          eventItem[1] = anonymizedEvent.event;
        } else {
          return { success: false, error: anonymizedEvent.error };
        }
      }
    }

    return { success: true, envelope };
  }

  /**
   * Given a sentry serialized exception
   * (https://develop.sentry.dev/sdk/event-payloads/exception/), return an
   * anonymized version of the event.
   */
  public async anonymizeEvent(event: Event): Promise<AnonymizeEventResult> {
    const result: Event = {
      event_id: event.event_id,
      platform: event.platform,
      timestamp: event.timestamp,
      extra: event.extra,
      release: event.release,
      contexts: event.contexts,
      sdk: event.sdk,
      level: event.level,
      server_name: GENERIC_SERVER_NAME,
      environment: event.environment,
    };

    if (event.exception !== undefined && event.exception.values !== undefined) {
      const anonymizedExceptions = await this.#anonymizeExceptions(
        event.exception.values,
      );
      result.exception = {
        values: anonymizedExceptions,
      };
    }

    return { success: true, event: result };
  }

  /**
   * Return the anonymized filename and a boolean indicating if the content of
   * the file should be anonymized
   */
  public async anonymizeFilename(filename: string): Promise<{
    anonymizedFilename: string;
    anonymizeContent: boolean;
  }> {
    if (filename === this.#configPath) {
      return {
        anonymizedFilename: path.basename(filename),
        anonymizeContent: true,
      };
    }

    const anonymizedFilename = anonymizeUserPaths(filename);

    // We anonymize the content if the file path is entirely anonymized, or if
    // it wasn't anonymized because it's just a basename
    const anonymizeContent =
      anonymizedFilename === ANONYMIZED_PATH ||
      path.basename(filename) === filename;

    return {
      anonymizedFilename,
      anonymizeContent,
    };
  }

  public anonymizeErrorMessage(errorMessage: string): string {
    errorMessage = this.#anonymizeMnemonic(errorMessage);

    // We intentionally replace the config path with its own
    // anonymized token, to help differentiate the config
    // file in exception reports while keeping it anonymized.
    if (this.#configPath !== undefined) {
      errorMessage = errorMessage.replaceAll(
        this.#configPath,
        "<hardhat-config-file>",
      );
    }

    // hide hex strings of 20 chars or more
    const hexRegex = /(0x)?[0-9A-Fa-f]{20,}/g;

    return anonymizeUserPaths(errorMessage).replace(hexRegex, (match) =>
      match.replace(/./g, "x"),
    );
  }

  public filterOutEventsWithExceptionsNotRaisedByHardhat(
    envelope: Envelope,
  ): Envelope {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
      We are just filtering events in place, not changing any type */
    envelope[1] = envelope[1].filter((item) => {
      if (item[0].type !== "event") {
        return true;
      }

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- We know that the item is an event item */
      const eventItem = item as EventItem;

      return this.raisedByHardhat(eventItem[1]);
    }) as any;

    return envelope;
  }

  public raisedByHardhat(event: Event): boolean {
    const exceptions = event?.exception?.values;

    if (exceptions === undefined) {
      // if we can't prove that the exception doesn't come from hardhat,
      // we err on the side of reporting the error
      return true;
    }

    const originalException = exceptions[exceptions.length - 1];

    if (!this.#isErrorMessageAllowed(originalException)) {
      return false;
    }

    const frames = originalException?.stacktrace?.frames;

    if (frames === undefined) {
      return true;
    }

    for (const frame of frames.slice().reverse()) {
      if (frame.filename === undefined) {
        continue;
      }

      // We don't report errors from the Hardhat.config file
      if (
        this.#configPath !== undefined &&
        this.#configPath.includes(frame.filename)
      ) {
        return false;
      }

      if (this.#isPackageFile(frame.filename)) {
        // We don't report errors from the ignored package list e.g. `ethers`
        // even when buried as a subpackage of a hardhat package
        if (this.#errorRaisedByPackageToIgnore(frame.filename)) {
          return false;
        }

        // We report errors from Hardhat packages, we exclude
        // those from non-hardhat packages
        return this.#isHardhatFile(frame.filename);
      }

      // Error originating not in packages, but in the user project
      // should be filtered.
      if (this.#isUserProjectFile(frame.filename)) {
        return false;
      }

      // Otherwise look at the next frame up
    }

    // if we didn't find any hardhat frame, we don't report the error
    return false;
  }

  #isErrorMessageAllowed(originalException: Exception): boolean {
    const exceptionType = originalException.type;
    const exceptionMessage = originalException.value;

    // Without an exception message, we can't filter so allow it
    if (exceptionMessage === undefined) {
      return true;
    }

    // Filter out required not defined in ES Modules errors
    if (
      exceptionType === "ReferenceError" &&
      exceptionMessage ===
        "require is not defined in ES module scope, you can use import instead"
    ) {
      return false;
    }

    // Filter out cannot find package when importing errors
    if (
      exceptionType === "Error" &&
      /^Cannot find package '([^']+)' imported from .+$/.test(exceptionMessage)
    ) {
      return false;
    }

    // Filter out cannot find module errors
    if (
      exceptionType === "Error" &&
      /^Cannot find module '([^']+)'/.test(exceptionMessage)
    ) {
      return false;
    }

    // Filter out "require() cannot be sued on an ESM graph"
    if (
      exceptionType === "Error" &&
      exceptionMessage.startsWith(
        "require() cannot be used on an ESM graph with top-level await. Use import() instead.",
      )
    ) {
      return false;
    }

    return true;
  }

  #errorRaisedByPackageToIgnore(filename: string): boolean {
    // List of external packages that we don't want to report errors from
    const pkgsToIgnore: string[] = [
      path.join("node_modules", "@ethersproject"),
    ];

    // Match path separators both for Windows and Unix
    const pkgs = filename.match(/node_modules[\/\\][^\/\\]+/g);

    if (pkgs === null) {
      return false;
    }

    const errorSourcePkg = pkgs[pkgs.length - 1];

    return pkgsToIgnore.includes(errorSourcePkg);
  }

  #isHardhatFile(filename: string): boolean {
    const nomicFoundationPath = path.join("node_modules", "@nomicfoundation");
    const ignoredOrgPath = path.join("node_modules", "@ignored");
    const hardhatPath = path.join("node_modules", "hardhat");

    filename = filename.toLowerCase();

    return (
      filename.includes(nomicFoundationPath) ||
      filename.includes(ignoredOrgPath) ||
      filename.includes(hardhatPath)
    );
  }

  #isPackageFile(filename: string): boolean {
    return filename.includes("node_modules");
  }

  #isUserProjectFile(filename: string): boolean {
    const anonymizedUserPath = anonymizeUserPaths(filename);

    return anonymizedUserPath === ANONYMIZED_PATH;
  }

  async #anonymizeExceptions(exceptions: Exception[]): Promise<Exception[]> {
    const anonymizedExceptions = await Promise.all(
      exceptions.map((exception) => this.#anonymizeException(exception)),
    );
    return anonymizedExceptions;
  }

  async #anonymizeException(value: Exception): Promise<Exception> {
    const result: Exception = {
      type: value.type,
      mechanism: value.mechanism,
    };

    if (value.value !== undefined) {
      result.value = this.anonymizeErrorMessage(value.value);
    }

    if (value.stacktrace !== undefined) {
      result.stacktrace = await this.#anonymizeStacktrace(value.stacktrace);
    }

    return result;
  }

  async #anonymizeStacktrace(stacktrace: Stacktrace): Promise<Stacktrace> {
    if (stacktrace.frames !== undefined) {
      const anonymizedFrames = await this.#anonymizeFrames(stacktrace.frames);
      return {
        frames: anonymizedFrames,
      };
    }

    return {};
  }

  async #anonymizeFrames(frames: StackFrame[]): Promise<StackFrame[]> {
    const anonymizedFrames = await Promise.all(
      frames.map(async (frame) => {
        return this.#anonymizeFrame(frame);
      }),
    );
    return anonymizedFrames;
  }

  async #anonymizeFrame(frame: StackFrame): Promise<StackFrame> {
    const result: StackFrame = {
      lineno: frame.lineno,
      colno: frame.colno,
      function: frame.function,
    };

    let anonymizeContent = true;
    if (frame.filename !== undefined) {
      const anonymizationResult = await this.anonymizeFilename(frame.filename);
      result.filename = anonymizationResult.anonymizedFilename;
      anonymizeContent = anonymizationResult.anonymizeContent;
    }

    if (!anonymizeContent) {
      result.context_line = frame.context_line;
      result.pre_context = frame.pre_context;
      result.post_context = frame.post_context;
      result.vars = frame.vars;
    }

    return result;
  }

  #anonymizeMnemonic(errorMessage: string): string {
    const matches = getAllWordMatches(errorMessage);

    // If there are enough consecutive words, there's a good chance of there being a mnemonic phrase
    if (matches.length < MNEMONIC_PHRASE_LENGTH_THRESHOLD) {
      return errorMessage;
    }

    const mnemonicWordList = [
      czech,
      english,
      french,
      italian,
      japanese,
      korean,
      simplifiedChinese,
      SPANISH,
      traditionalChinese,
    ]
      .map((wordlistModule) => wordlistModule.wordlist)
      .flat();

    let anonymizedMessage = errorMessage.slice(0, matches[0].index);

    // Determine all mnemonic phrase maximal fragments.
    // We check sequences of n consecutive words just in case there is a typo
    let wordIndex = 0;
    while (wordIndex < matches.length) {
      const maximalPhrase = getMaximalMnemonicPhrase(
        matches,
        errorMessage,
        wordIndex,
        mnemonicWordList,
      );

      if (maximalPhrase.length >= MINIMUM_AMOUNT_OF_WORDS_TO_ANONYMIZE) {
        const lastAnonymizedWord = maximalPhrase[maximalPhrase.length - 1];
        const nextWordIndex =
          wordIndex + maximalPhrase.length < matches.length
            ? matches[wordIndex + maximalPhrase.length].index
            : errorMessage.length;
        const sliceUntilNextWord = errorMessage.slice(
          lastAnonymizedWord.index + lastAnonymizedWord.word.length,
          nextWordIndex,
        );
        anonymizedMessage += `${ANONYMIZED_MNEMONIC}${sliceUntilNextWord}`;
        wordIndex += maximalPhrase.length;
      } else {
        const thisWord = matches[wordIndex];
        const nextWordIndex =
          wordIndex + 1 < matches.length
            ? matches[wordIndex + 1].index
            : errorMessage.length;
        const sliceUntilNextWord = errorMessage.slice(
          thisWord.index,
          nextWordIndex,
        );
        anonymizedMessage += sliceUntilNextWord;
        wordIndex++;
      }
    }

    return anonymizedMessage;
  }
}

function getMaximalMnemonicPhrase(
  matches: WordMatch[],
  originalMessage: string,
  startIndex: number,
  mnemonicWordList: string[],
): WordMatch[] {
  const maximalPhrase: WordMatch[] = [];
  for (let i = startIndex; i < matches.length; i++) {
    const thisMatch = matches[i];
    if (!mnemonicWordList.includes(thisMatch.word)) {
      break;
    }

    if (maximalPhrase.length > 0) {
      // Check that there's only whitespace until this word.
      const lastMatch = maximalPhrase[maximalPhrase.length - 1];
      const lastIndex = lastMatch.index + lastMatch.word.length;
      const sliceBetweenWords = originalMessage.slice(
        lastIndex,
        thisMatch.index,
      );
      if (!/\s+/u.test(sliceBetweenWords)) {
        break;
      }
    }

    maximalPhrase.push(thisMatch);
  }
  return maximalPhrase;
}

function getAllWordMatches(errorMessage: string) {
  const matches: WordMatch[] = [];
  const re = /\p{Letter}+/gu;
  let match = re.exec(errorMessage);
  while (match !== null) {
    matches.push({
      word: match[0],
      index: match.index,
    });
    match = re.exec(errorMessage);
  }
  return matches;
}
