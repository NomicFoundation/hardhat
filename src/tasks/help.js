const { getPublicTasksNames, getTaskDescription } = require("../core/tasks");

task("help", "Prints this message", async () => {
  console.log(`Usage: npx sool [task]
  
Available tasks:
`);

  const nameLength = getPublicTasksNames()
    .map(n => n.length)
    .reduce((a, b) => Math.max(a, b), 0);

  for (const name of getPublicTasksNames().sort()) {
    const description = getTaskDescription(name);
    console.log(`  ${name.padEnd(nameLength)}\t${description}`);
  }
});
