const { app, Router } = require('hyperapp')
const main = require('./view/main')
const repo = require('./view/repo')
const css = require('sheetify')
const projects = require('projects')

css('./index.css')

var initialRepo = window.location.hash.slice(1)
var initial = initialRepo && projects.find(x => x.name === initialRepo)

app({
  root: document.getElementById('main'),

  model: {
    active: initial,
    projects: projects
  },

  subscriptions: [
    (_, actions) => {
      window.addEventListener('hashchange', function () {
        actions.select(window.location.hash.slice(1))
      })
    }
  ],

  actions: {
    select: (state, project) =>
      ({ active: project && state.projects.find(x => x.name === project) })
  },

  view: (state, actions) =>
    window.location.hash
    ? repo(state, actions)
    : main(state, actions)
})
