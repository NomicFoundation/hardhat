const { getPublicTasks } = require("../core/tasks");

task("help", "Prints this message", async () => {
  console.log(`Usage: npx sool [task]
  
Available tasks:
`);

  const nameLength = getPublicTasks()
    .map(t => t.name.length)
    .reduce((a, b) => Math.max(a, b), 0);

  for (const t of getPublicTasks().sort((a, b) => b.name < a.name)) {
    const description = t.description ? t.description : "";
    console.log(`  ${t.name.padEnd(nameLength)}\t${description}`);
  }
});
