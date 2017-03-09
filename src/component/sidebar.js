const { h } = require('hyperapp')

module.exports = (state, actions) =>
  h('div', { class: 'sidebar' }, state.projects.map(project =>
    h('div', { class: 'project' }, [
      h('a', { class: 'project-name', href: '#' + project.name }, project.name)
    ])
  ))
