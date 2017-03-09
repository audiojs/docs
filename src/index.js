const { app, Router } = require('hyperapp')
const main = require('./view/main')
const repo = require('./view/repo')

app({
  root: document.getElementById('main'),

  model: {
    active: false,
    projects: require('modules')
  },

  subscriptions: [
    (_, actions) => {
      window.addEventListener('hashchange', function () {
        var hash = window.location.hash
        actions.select(hash && hash.slice(1))
      })
    }
  ],

  actions: {
    select: (state, project) =>
      ({ active: project })
  },

  view: (state, actions) =>
    window.location.hash
    ? repo(state, actions)
    : main(state, actions)
})
