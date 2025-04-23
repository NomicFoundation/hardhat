import chalk from "chalk";

export default async function (): Promise<void> {
  console.log(
    chalk.yellow(
      "This task will be implemented soon. Check back soon for more updates.",
    ),
  );
}
