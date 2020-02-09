const shell = require('shelljs')

shell.exec('npx lerna bootstrap --no-ci')

// We delete these .bin folders because lerna creates them and then npm doesn't link the packages
// shell.rm('-rf', 'packages/*/node_modules/.bin')
