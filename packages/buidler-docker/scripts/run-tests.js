const shell = require('shelljs')

shell.exec('node ../../node_modules/mocha/bin/mocha --exit', { fatal: true })
