const { h } = require('hyperapp')
const css = require('sheetify')

module.exports = (model, actions) =>
  <div class='sidebar'>
    <h1>audio<span>.js</span></h1>
    <input class='list-search' placeholder='search packages'
           oninput={e => actions.filter(e.target.value)} />
    <div class='list'>{list(model, actions)}</div>
  </div>

const list = ({ active, list }, actions) =>
  list.map(({ name }) =>
    <div class={active && active.name === name ? 'active project' : 'project'}>
      <a class='project-name' href={'#' + name}>
        {name.indexOf('audiojs/') === 0 ? name.slice(8) : project.name}
      </a>
    </div>
  )

css`
  .sidebar {
    min-width: 325px;
    padding: 20px;
    overflow: auto;
  }

  .sidebar h1 {
    margin: 0;
    margin-bottom: 20px;
    font-weight: 300;
    font-size: 2.5em;
  }

  .sidebar h1 span {
    color: #AAA;
  }

  .list-search {
    font-family: 'Source Code Pro';
    width: 100%;
    border: 0;
    border-bottom: 1px solid #DDD;
    padding: 5px 0;
    margin-bottom: 20px;
    background: transparent;
    outline: none;
  }

  .list .project {
    font-family: 'Source Code Pro';
    margin-bottom: 10px;
  }

  .list .project .project-name {
    text-decoration: none;
    font-size: 0.9em;
    color: #000;
  }

  .list .project.active .project-name {
    color: #b63030;
  }
`
