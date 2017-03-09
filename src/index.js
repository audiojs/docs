var modules = require('modules')
var { app, h } = require('hyperapp')

app({
  root: document.querySelector('.main'),

  model: {

  },

  view: (state, actions) =>
    h('div', { class: 'app' }, modules.map(function (projects) {
      return h('div', {}, projects.name)
    }))
})
