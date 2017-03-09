const gh = require('gh-pages')

gh.publish(__dirname + '/../dist', function (err) {
  if (err) throw err
  console.log('Deployed')
})
