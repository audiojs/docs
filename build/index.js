const cpy = require('cpy')
const gh = require('gh-pages')
const b = require('browserify')
const fs = require('fs')
const rimraf = require('rimraf')

const start = () =>
  rimraf('tmp', copy)

const copy = (err) => err ? console.error(err)
  : cpy(['src/**/*.*', 'modules.json'], 'tmp').then(bundle, console.error)

const bundle = () =>
  b('tmp/index.js').bundle(write)

const write = (err, buf) => err ? console.error('write:', err)
  : fs.writeFile('tmp/index.bundle.js', buf, dist)

const dist = (err) => err ? console.log('dist:', err)
  : cpy(['tmp/index.html', 'tmp/index.bundle.js'], 'dist').then(clean, console.error)

const clean = () =>
  rimraf('tmp', publish)

const publish = (err) => err ? console.error('publish:', err)
  : gh.publish('dist', finish)

const finish = (err) => err ? console.error('finish:', err)
  : console.log('Published to gh-pages')

// Start:
start()
