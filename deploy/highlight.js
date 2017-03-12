var Highlight = require('syntax-highlighter')
var highlight = new Highlight()

highlight.use(require('highlight-javascript'))

var languages = Object.keys(highlight.languages)

module.exports = markedHighlight

function markedHighlight (code, lang) {
  if (languages.indexOf(lang) === -1) return code
  return highlight.string(code, lang)
}
