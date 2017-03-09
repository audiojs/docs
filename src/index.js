const { h, app, Router } = require('hyperapp')
const css = require('sheetify')
const projects = require('projects')
const sidebar = require('./sidebar')
const readme = require('./readme')
const start = require('./start')

app({
  root: document.getElementById('main'),

  model: {
    active: null,
    list: projects
  },

  subscriptions: [
    // This is the mini router thing
    // Just looks for `#<repo>`, e.g. `#audiojs/audio`
    (model, actions) => {
      var initial = window.location.hash.slice(1)
      if (initial) actions.visit(initial)
      window.addEventListener('hashchange', function () {
        actions.visit(window.location.hash.slice(1))
      })
    }
  ],

  actions: {
    visit: (model, project) =>
      ({ active: project && model.list.find(x => x.name === project) }),

    filter: (model, filter) =>
      ({ list: projects.filter(x => x.name.indexOf(filter) !== -1) })
  },

  view: (model, actions) =>
    <div class='app'>
      { sidebar(model, actions) }
      { model.active
        ? readme(model, actions)
        : start(model, actions) }
    </div>
})

css`
  html, body, #main, .app {
    margin: 0;
    padding: 0;
    font-family: 'Source Sans Pro';
    background: #fafafa;
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
