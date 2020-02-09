const shell = require('shelljs')

shell.exec('npx lerna exec -- npm run build')
shell.exec('npx lerna exec -- npm run build-test')
shell.exec('npx lerna exec --concurrency 1 -- npm run test', {
  TS_NODE_TRANSPILE_ONLY: 'true'
})
