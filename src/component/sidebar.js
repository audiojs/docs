const { h } = require('hyperapp')
const css = require('sheetify')

module.exports = (state, actions) =>
  h('div', { class: 'sidebar' }, [
    h('h1', null, 'audio'),
    projects(state, actions)
  ])

const projects = ({ active, projects }, actions) =>
  h('div', { class: 'projects' }, projects.map(project =>
    h('div', {
      class: 'project' + (active.name === project.name ? ' active' : '')
    }, [
      h('a', { class: 'project-name', href: '#' + project.name }, project.name)
    ])
  ))

css`
  .sidebar {
    min-width: 300px;
    padding: 20px;
  }

  .sidebar h1 {
    margin: 0;
    font-family: Lato;
    font-size: 3em;
    font-weight: 300;
    padding-bottom: 20px
  }

  .sidebar .projects .project {
    margin-bottom: 5px;
  }

  .sidebar .projects .project .project-name {
    font-family: 'Source Code Pro';
    font-weight: 300;
    font-size: 0.9em;
    text-decoration: none;
    color: #000;
  }

  .sidebar .projects .project.active .project-name {
    color: #d21111;
  }
`
