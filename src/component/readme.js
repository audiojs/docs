const { h } = require('hyperapp')
const css = require('sheetify')
const marked = require('marked')


module.exports = (state, actions) => {

  function render (el) {
    el.innerHTML = marked(state.active.readme)
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

  .readme pre {
    background: #F0F0F0;
    padding: 10px;
  }
`
