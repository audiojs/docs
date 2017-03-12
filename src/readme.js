const { h } = require('hyperapp')
const css = require('sheetify')
const marked = require('marked')


module.exports = (state, actions) => {

  function render (el) {
    el.innerHTML = state.active.readme
  }

  return h('div', {
    class: 'readme',
    onCreate: render,
    onUpdate: render
  }, [])
}

css`
  .readme {
    width: 100%;
    padding: 20px;
    overflow: auto;
    line-height: 1.5;
  }

  .readme h1, .readme h2, .readme h3, .readme h4 {
    font-weight: 400;
    margin: 0;
  }
  .readme h1 { font-size: 3em }
  .readme h2 { font-size: 2.25em }
  .readme h3 { font-size: 2em }
  .readme h4 { font-size: 1.75em }

  .readme pre {
    background: #F0F0F0;
    padding: 10px;
    overflow: auto;
  }
`
