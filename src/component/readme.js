const { h } = require('hyperapp')
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
