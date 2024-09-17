export class Duration {
  /**
   * Converts the given number of years into seconds.
   *
   * @param n - The number of years.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.years(1);
   */
  public years(n: number): number {
    return this.days(n) * 365;
  }

  /**
   * Converts the given number of weeks into seconds.
   *
   * @param n - The number of weeks.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.weeks(1);
   */
  public weeks(n: number): number {
    return this.days(n) * 7;
  }

  /**
   * Converts the given number of days into seconds.
   *
   * @param n - The number of days.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.days(1);
   */
  public days(n: number): number {
    return this.hours(n) * 24;
  }

  /**
   * Converts the given number of hours into seconds.
   *
   * @param n - The number of hours.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.hours(1);
   */
  public hours(n: number): number {
    return this.minutes(n) * 60;
  }

  /**
   * Converts the given number of minutes into seconds.
   *
   * @param n - The number of minutes.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.minutes(1);
   */
  public minutes(n: number): number {
    return n * 60;
  }

  /**
   * Returns the number of seconds.
   *
   * @param n - The number of seconds.
   * @returns The same number of seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.seconds(1);
   */
  public seconds(n: number): number {
    return n;
  }

  /**
   * Converts the given number of milliseconds into seconds, rounded down to the nearest whole number.
   *
   * @param n - The number of milliseconds.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.millis(1500); // Returns 1
   */
  public millis(n: number): number {
    return Math.floor(n / 1000);
  }
}
