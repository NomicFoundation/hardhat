import type { Duration as DurationI } from "../../../types.js";

export class Duration implements DurationI {
  public years(n: number): number {
    return this.days(n) * 365;
  }

  public weeks(n: number): number {
    return this.days(n) * 7;
  }

  public days(n: number): number {
    return this.hours(n) * 24;
  }

  public hours(n: number): number {
    return this.minutes(n) * 60;
  }

  public minutes(n: number): number {
    return n * 60;
  }

  public seconds(n: number): number {
    return n;
  }

  public millis(n: number): number {
    return Math.floor(n / 1000);
  }
}
