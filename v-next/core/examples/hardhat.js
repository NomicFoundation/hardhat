// This is a temporary file simulating what the compiled output would do
import "tsx";

const { main } = await import(import.meta.resolve("./example-cli.ts"));

main().catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
