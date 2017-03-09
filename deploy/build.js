const pull = require('pull-stream')
const b = require('pull-browserify')
const vinyl = require('pull-vinyl')
const ecodoc = require('ecodoc')
const cpy = require('cpy')
const doc = ecodoc({ data: __dirname + '/cache' })

pull(
  pull.once(require(__dirname + '/../modules')),
  pull.asyncMap(doc),
  pull.map(x => new Buffer(JSON.stringify(x))),
  vinyl.map('modules.json'),
  vinyl.write(__dirname + '/tmp', function (err) {
    if (err) throw err
    bundle()
  })
)

function bundle () {
  pull(
    b.source(__dirname + '/../src/index.js'),
    b.require(__dirname + '/tmp/modules.json', { expose: 'modules' }),
    b.transform('es2040'),
    b.bundle(),
    vinyl.map('index.js'),
    vinyl.write(__dirname + '/tmp', function (err) {
      if (err) throw err
      copy()
    })
  )
}

function copy () {
  cpy([
    __dirname + '/tmp/index.js',
    __dirname + '/../src/index.html'
  ], __dirname + '/../dist').then(function () {
    console.log('Built')
  })
}