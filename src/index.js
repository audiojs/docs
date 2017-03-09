const { app, Router } = require('hyperapp')
const main = require('./view/main')
const repo = require('./view/repo')
const css = require('sheetify')
const projects = require('projects')

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

css`
  html, body, #main, .app {
    margin: 0;
    padding: 0;
    font-family: Lato;
    width: 100%;
    height: 100%;
  }

  * {
    box-sizing: border-box
  }

  .app {
    display: flex;
  }
`
