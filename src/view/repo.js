const { h } = require('hyperapp')
const sidebar = require('../component/sidebar')

module.exports = (state, actions) =>
  h('div', { class: 'app' }, [
    sidebar(state, actions),
    h('span', {}, 'selected ' + state.active)
  ])
