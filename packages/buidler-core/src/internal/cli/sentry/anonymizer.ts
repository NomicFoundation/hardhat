import { Event, Exception, StackFrame, Stacktrace } from "@sentry/node";
import findup from "find-up";
import { either } from "fp-ts";
import * as path from "path";

export class Anonymizer {
  constructor(private _configPath?: string) {}

  /**
   * Given a sentry serialized exception
   * (https://develop.sentry.dev/sdk/event-payloads/exception/), return an
   * anonymized version of the event.
   */
  public anonymize(event: any): either.Either<string, Event> {
    if (event === null || event === undefined) {
      return either.left("event is null or undefined");
    }
    if (typeof event !== "object") {
      return either.left("event is not an object");
    }

    const result: Event = {
      event_id: event.event_id,
      platform: event.platform,
      timestamp: event.timestamp,
    };

    if (event.exception !== undefined && event.exception.values !== undefined) {
      const anonymizededExceptions = this._anonymizeExceptions(
        event.exception.values
      );
      result.exception = {
        values: anonymizededExceptions,
      };
    }

    return either.right(result);
  }

  private _anonymizeExceptions(exceptions: Exception[]): Exception[] {
    return exceptions.map((exception) => this._anonymizeException(exception));
  }

  private _anonymizeException(value: Exception): Exception {
    const result: Exception = {
      type: value.type,
      value: value.value,
    };

    if (value.stacktrace !== undefined) {
      result.stacktrace = this._anonymizeStacktrace(value.stacktrace);
    }

    return result;
  }

  private _anonymizeStacktrace(stacktrace: Stacktrace): Stacktrace {
    if (stacktrace.frames !== undefined) {
      const anonymizededFrames = this._anonymizeFrames(stacktrace.frames);
      return {
        frames: anonymizededFrames,
      };
    }

    return {};
  }

  private _anonymizeFrames(frames: StackFrame[]): StackFrame[] {
    return frames.map((frame) => this._anonymizeFrame(frame));
  }

  private _anonymizeFrame(frame: StackFrame): StackFrame {
    const result: StackFrame = {
      lineno: frame.lineno,
      colno: frame.colno,
      function: frame.function,
    };

    if (frame.filename !== undefined) {
      result.filename = this._anonymizeFilename(frame.filename);
    }

    return result;
  }

  private _anonymizeFilename(filename: string): string {
    const parts = filename.split(path.sep);

    if (filename === this._configPath) {
      const packageJsonPath = findup.sync("package.json", {
        cwd: path.dirname(filename),
      });

      if (packageJsonPath === null) {
        // if we can't find a package.json, we just return the basename
        return path.basename(filename);
      }

      return path.relative(path.dirname(packageJsonPath), filename);
    }

    const nodeModulesIndex = parts.indexOf("node_modules");

    if (nodeModulesIndex === -1) {
      if (filename.startsWith("internal")) {
        // show internal parts of the stack trace
        return filename;
      }

      // if the file isn't inside node_modules and it's a user file, we hide it completely
      return "<user-file>";
    }

    return parts.slice(nodeModulesIndex).join(path.sep);
  }
}
