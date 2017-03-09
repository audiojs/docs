const { h } = require('hyperapp')
const sidebar = require('../component/sidebar')
const readme = require('../component/readme')

module.exports = (state, actions) =>
  h('div', { class: 'app' }, [
    sidebar(state, actions),
    readme(state, actions)
  ])
