export function displaySeparator() {
  console.log("─".repeat(Math.min(process.stdout.columns ?? 80)));
}
