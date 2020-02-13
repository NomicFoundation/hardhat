const shell = require('shelljs')
shell.config.fatal = true

shell.exec('node ../../node_modules/mocha/bin/mocha --exit')
