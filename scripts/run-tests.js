const shell = require('shelljs')

shell.config.fatal = true // throw if a command fails

shell.exec('npx lerna exec -- npm run build')
shell.exec('npx lerna exec -- npm run build-test')
shell.exec('npx lerna exec --concurrency 1 -- npm run test', {
  TS_NODE_TRANSPILE_ONLY: 'true'
})
