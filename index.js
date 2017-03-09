require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var containers = []; // will store container HTMLElement references
var styleElements = []; // will store {prepend: HTMLElement, append: HTMLElement}

var usage = 'insert-css: You need to provide a CSS string. Usage: insertCss(cssString[, options]).';

function insertCss(css, options) {
    options = options || {};

    if (css === undefined) {
        throw new Error(usage);
    }

    var position = options.prepend === true ? 'prepend' : 'append';
    var container = options.container !== undefined ? options.container : document.querySelector('head');
    var containerId = containers.indexOf(container);

    // first time we see this container, create the necessary entries
    if (containerId === -1) {
        containerId = containers.push(container) - 1;
        styleElements[containerId] = {};
    }

    // try to get the correponding container + position styleElement, create it otherwise
    var styleElement;

    if (styleElements[containerId] !== undefined && styleElements[containerId][position] !== undefined) {
        styleElement = styleElements[containerId][position];
    } else {
        styleElement = styleElements[containerId][position] = createStyleElement();

        if (position === 'prepend') {
            container.insertBefore(styleElement, container.childNodes[0]);
        } else {
            container.appendChild(styleElement);
        }
    }

    // strip potential UTF-8 BOM if css was read from a file
    if (css.charCodeAt(0) === 0xFEFF) { css = css.substr(1, css.length); }

    // actually add the stylesheet
    if (styleElement.styleSheet) {
        styleElement.styleSheet.cssText += css
    } else {
        styleElement.textContent += css;
    }

    return styleElement;
};

function createStyleElement() {
    var styleElement = document.createElement('style');
    styleElement.setAttribute('type', 'text/css');
    return styleElement;
}

module.exports = insertCss;
module.exports.insertCss = insertCss;

},{}],2:[function(require,module,exports){
(function (global){
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3] || ''
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: !this.options.sanitizer
          && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? this.options.sanitizer
          ? this.options.sanitizer(cap[0])
          : escape(cap[0])
        : cap[0]
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.text(escape(this.smartypants(cap[0])));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/---/g, '\u2014')
    // en-dashes
    .replace(/--/g, '\u2013')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  if (!this.options.mangle) return text;
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

Renderer.prototype.text = function(text) {
  return text;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
	// explicitly match decimal, hex, and named HTML entities 
  return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
module.exports = require('insert-css')

},{"insert-css":1}],4:[function(require,module,exports){
var _require = require('hyperapp'),
    h = _require.h;

var css = 0;
var marked = require('marked');

module.exports = function (state, actions) {

  function render(el) {
    el.innerHTML = marked(state.active.readme);
  }

  return h('div', {
    class: 'readme',
    onCreate: render,
    onUpdate: render
  }, []);
};(require('sheetify/insert')(".readme {\n    width: 100%;\n    padding: 20px;\n    overflow: auto;\n    line-height: 1.5;\n  }\n\n  .readme pre {\n    background: #F0F0F0;\n    padding: 10px;\n  }") || true) && "_361dcda8";
},{"hyperapp":9,"marked":2,"sheetify/insert":3}],5:[function(require,module,exports){
var _require = require('hyperapp'),
    h = _require.h;

var css = 0;

module.exports = function (state, actions) {
  return h('div', { class: 'sidebar' }, [h('h1', null, 'audio'), projects(state, actions)]);
};

var projects = function (_ref, actions) {
  var active = _ref.active,
      projects = _ref.projects;
  return h('div', { class: 'projects' }, projects.map(function (project) {
    return h('div', {
      class: 'project' + (active.name === project.name ? ' active' : '')
    }, [h('a', { class: 'project-name', href: '#' + project.name }, project.name)]);
  }));
};(require('sheetify/insert')(".sidebar {\n    min-width: 300px;\n    padding: 20px;\n  }\n\n  .sidebar h1 {\n    margin: 0;\n    font-family: Lato;\n    font-size: 3em;\n    font-weight: 300;\n    padding-bottom: 20px\n  }\n\n  .sidebar .projects .project {\n    margin-bottom: 5px;\n  }\n\n  .sidebar .projects .project .project-name {\n    font-family: 'Source Code Pro';\n    font-weight: 300;\n    font-size: 0.9em;\n    text-decoration: none;\n    color: #000;\n  }\n\n  .sidebar .projects .project.active .project-name {\n    color: #d21111;\n  }") || true) && "_57efd086";
},{"hyperapp":9,"sheetify/insert":3}],6:[function(require,module,exports){
var _require = require('hyperapp'),
    app = _require.app,
    Router = _require.Router;

var main = require('./view/main');
var repo = require('./view/repo');
var css = 0;
var projects = require('projects');

var initialRepo = window.location.hash.slice(1);
var initial = initialRepo && projects.find(function (x) {
  return x.name === initialRepo;
});

app({
  root: document.getElementById('main'),

  model: {
    active: initial,
    projects: projects
  },

  subscriptions: [function (_, actions) {
    window.addEventListener('hashchange', function () {
      actions.select(window.location.hash.slice(1));
    });
  }],

  actions: {
    select: function (state, project) {
      return { active: project && state.projects.find(function (x) {
          return x.name === project;
        }) };
    }
  },

  view: function (state, actions) {
    return window.location.hash ? repo(state, actions) : main(state, actions);
  }
});(require('sheetify/insert')("html, body, #main, .app {\n    margin: 0;\n    padding: 0;\n    font-family: Lato;\n    width: 100%;\n    height: 100%;\n  }\n\n  * {\n    box-sizing: border-box\n  }\n\n  .app {\n    display: flex;\n  }") || true) && "_e728b040";
},{"./view/main":7,"./view/repo":8,"hyperapp":9,"projects":"projects","sheetify/insert":3}],7:[function(require,module,exports){
var _require = require('hyperapp'),
    h = _require.h;

var sidebar = require('../component/sidebar');

module.exports = function (state, actions) {
  return h('div', { class: 'app' }, [sidebar(state, actions), h('div', {}, 'none selected')]);
};
},{"../component/sidebar":5,"hyperapp":9}],8:[function(require,module,exports){
var _require = require('hyperapp'),
    h = _require.h;

var sidebar = require('../component/sidebar');
var readme = require('../component/readme');

module.exports = function (state, actions) {
  return h('div', { class: 'app' }, [sidebar(state, actions), readme(state, actions)]);
};
},{"../component/readme":4,"../component/sidebar":5,"hyperapp":9}],9:[function(require,module,exports){
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t(e.hyperapp=e.hyperapp||{})}(this,function(e){"use strict";function t(e,n,o){n.ns="http://www.w3.org/2000/svg";for(var r=0;r<o.length;r++){var a=o[r];a.data&&t(a.tag,a.data,a.children)}}function n(e,t){var n,o={};for(var r in e){var a=[];if("*"!==r&&(t.replace(new RegExp("^"+r.replace(/\//g,"\\/").replace(/:([A-Za-z0-9_]+)/g,function(e,t){return a.push(t),"([A-Za-z0-9_]+)"})+"/?$","g"),function(){for(var e=1;e<arguments.length-2;e++)o[a.shift()]=arguments[e];n=r}),n))break}return{match:n||"*",params:o}}var o,r,a,i=[],f=function(e,n){var f,c;for(a=[],o=arguments.length;o-- >2;)i.push(arguments[o]);for(;i.length;)if(Array.isArray(r=i.pop()))for(o=r.length;o--;)i.push(r[o]);else null!=r&&r!==!0&&r!==!1&&("number"==typeof r&&(r+=""),f="string"==typeof r,f&&c?a[a.length-1]+=r:(a.push(r),c=f));return"function"==typeof e?e(n,a):("svg"===e&&t(e,n,a),{tag:e,data:n||{},children:a})},c=function(e){function t(e){for(var t=0;t<b.onError.length;t++)b.onError[t](e);if(t<=0)throw e}function n(e,a,i){Object.keys(a).forEach(function(f){e[f]||(e[f]={});var c,u=i?i+"."+f:f,d=a[f];"function"==typeof d?e[f]=function(e){for(c=0;c<b.onAction.length;c++)b.onAction[c](u,e);var n=d(p,e,m,t);if(void 0===n||"function"==typeof n.then)return n;for(c=0;c<b.onUpdate.length;c++)b.onUpdate[c](p,n,e);p=r(p,n),o(p,g)}:n(e[f],d,u)})}function o(e,t){for(n=0;n<b.onRender.length;n++)t=b.onRender[n](e,t);l(v,h,h=t(e,m),0);for(var n=0;n<E.length;n++)E[n]();E=[]}function r(e,t){var n,o={};if(a(t)||Array.isArray(t))return t;for(n in e)o[n]=e[n];for(n in t)o[n]=t[n];return o}function a(e){return"string"===(e=typeof e)||"number"===e||"boolean"===e}function i(e,t){setTimeout(function(){e(t)},0)}function f(e,t){return e.tag!==t.tag||typeof e!=typeof t||a(e)&&e!==t}function c(e,t){var n;if("string"==typeof e)n=document.createTextNode(e);else{t=t||e.data._unsafe,n=e.data&&e.data.ns?document.createElementNS(e.data.ns,e.tag):document.createElement(e.tag);for(var o in e.data)"onCreate"===o?i(e.data[o],n):d(n,o,e.data[o]);for(var r=0;r<e.children.length;r++)n.appendChild(c(e.children[r]))}return n}function u(e,t,n){e.removeAttribute("className"===t?"class":t),"boolean"!=typeof n&&"true"!==n&&"false"!==n||(e[t]=!1)}function d(e,t,n,o){if("style"===t)for(var r in n)e.style[r]=n[r];else if("o"===t[0]&&"n"===t[1]){var a=t.substr(2).toLowerCase();e.removeEventListener(a,o),e.addEventListener(a,n)}else"false"===n||n===!1?(e.removeAttribute(t),e[t]=!1):(e.setAttribute(t,n),"http://www.w3.org/2000/svg"!==e.namespaceURI&&(e[t]=n))}function s(e,t,n){for(var o in r(n,t)){var a=t[o],f=n[o],c=e[o];void 0===a?u(e,o,f):"onUpdate"===o?i(a,e):(a!==f||"boolean"==typeof c&&c!==a)&&d(e,o,a,f)}}function l(e,t,n,o){if(void 0===t)e.appendChild(c(n));else if(void 0===n){var r=e.childNodes[o];E.push(e.removeChild.bind(e,r)),t&&t.data&&t.data.onRemove&&i(t.data.onRemove,r)}else if(f(n,t))e.replaceChild(c(n),e.childNodes[o]);else if(n.tag){var r=e.childNodes[o];s(r,n.data,t.data);for(var a=n.children.length,u=t.children.length,d=0;d<a||d<u;d++){var p=n.children[d];l(r,t.children[d],p,d)}}}for(var p,h,v,g=e.view||function(){return""},m={},y=[],b={onError:[],onAction:[],onUpdate:[],onRender:[]},w=[e].concat((e.plugins||[]).map(function(t){return t(e)})),E=[],A=0;A<w.length;A++){var R=w[A];void 0!==R.model&&(p=r(p,R.model)),R.actions&&n(m,R.actions),R.subscriptions&&(y=y.concat(R.subscriptions));var C=R.hooks;C&&Object.keys(C).forEach(function(e){b[e].push(C[e])})}!function(e){"l"!==document.readyState[0]?e():document.addEventListener("DOMContentLoaded",e)}(function(){v=e.root||document.body.appendChild(document.createElement("div")),o(p,g);for(var n=0;n<y.length;n++)y[n](p,m,t)})},u=function(e){return{model:{router:n(e.view,location.pathname)},actions:{router:{match:function(t,o){return{router:n(e.view,o)}},go:function(e,t,n){history.pushState({},"",t),n.router.match(t)}}},hooks:{onRender:function(t){return e.view[t.router.match]}},subscriptions:[function(e,t){addEventListener("popstate",function(){t.router.match(location.pathname)})}]}};e.h=f,e.app=c,e.Router=u});


},{}],"projects":[function(require,module,exports){
module.exports=[{"name":"audiojs/audio","link":"https://github.com/audiojs/audio","stars":37,"readme":"# Audio [![build status][travis-i]][travis] [![gitter][gitter-i]][gitter]\n> Framework for handling audio in JavaScript.\n\n```javascript\n// Use streams to create, manipulate, or serialize audio.\n// For example, decoding and encoding with audio-wav:\nfs.createReadStream('./foo.wav').pipe(wav.decode())\n\n// Create your own streams to use the PCM data directly.\n.pipe(through2.obj(function(audio, enc, callback) {\n  // Read pulse values\n  var left = audio.read(200, 1);\n  var right = audio.read(100, 2);\n\n  // Write pulse values\n  audio.write(7, 500, 2);\n\n  // Push audio to continue pipe chain.\n  callback(null, audio);\n}));\n```\n\nA framework and object for using audio in JavaScript.  Based on top of streams to allow chaining utilities that wrap more complex operations.\n\n## Documentation\nSee [the `docs/` folder](docs/) for info on the framework and object.  Use [StackOverflow][stackoverflow] for your questions.\n\n## Installation\nUse the [npm keyword \"audiojs\"][npm-audiojs] to find utilities (with directions in their own READMEs).\n\nIf you are creating a utility and need to use the `Audio` object:\n```shell\n$ npm install --save audio\n```\n(Use `audio@next` for latest prerelease versions)\n\n## Credits\n\n|  ![jamen][author-avatar]  |\n|:-------------------------:|\n| [Jamen Marz][author-site] |\n\n## License\n[MIT](LICENSE) &copy; Jamen Marz\n\n\n[travis]: https://travis-ci.org/audiojs/audio\n[travis-i]: https://travis-ci.org/audiojs/audio.svg\n[gitter]: https://gitter.im/audiojs/audio\n[gitter-i]: https://badges.gitter.im/Join%20Chat.svg\n[npm-audiojs]: https://www.npmjs.com/browse/keyword/audiojs\n[author-site]: https://github.com/jamen\n[author-avatar]: https://avatars.githubusercontent.com/u/6251703?v=3&s=125\n[stackoverflow]: http://stackoverflow.com/questions/ask\n"},{"name":"audiojs/audio-buffer","link":"https://github.com/audiojs/audio-buffer","stars":14,"readme":"# audio-buffer [![Build Status](https://travis-ci.org/audiojs/audio-buffer.svg?branch=master)](https://travis-ci.org/audiojs/audio-buffer) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\n[AudioBuffer](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) ponyfill. Provides useful constructor for Web-Audio API _AudioBuffer_, if available, otherwise provides optimal _AudioBuffer_ implementation for node/browsers. Useful instead of _Buffer_ in audio streams (see [**@audiojs**](https://github.com/audiojs) components).\n\n## Usage\n\n[![npm install audio-buffer](https://nodei.co/npm/audio-buffer.png?mini=true)](https://npmjs.org/package/audio-buffer/)\n\n```js\nvar AudioBuffer = require('audio-buffer')\n\n//Create audio buffer from a data source or of a length.\n//Data is interpreted as a planar sequence of float32 samples.\n//It can be Array, TypedArray, ArrayBuffer, Buffer, AudioBuffer, DataView, NDArray etc.\nvar buffer = new AudioBuffer(channels = 2, data|length, sampleRate = 44100)\n\n//Duration of the underlying audio data, in seconds\nbuffer.duration\n\n//Number of samples per channel\nbuffer.length\n\n//Default sample rate is 44100\nbuffer.sampleRate\n\n//Default number of channels is 2\nbuffer.numberOfChannels\n\n//Get array containing the data for the channel (not copied)\nbuffer.getChannelData(channel)\n\n//Place data from channel to destination Float32Array\nbuffer.copyFromChannel(destination, channelNumber, startInChannel = 0)\n\n//Place data from source Float32Array to the channel\nbuffer.copyToChannel(source, channelNumber, startInChannel = 0)\n\n\n//Some special properties, itâs unlikely you will ever need them.\n\n//Type of array for data. Float64Array is faster for modern node/browsers.\nAudioBuffer.FloatArray = Float64Array\n\n//In browser, you can set custom audio context (online/offline).\nAudioBuffer.context = require('audio-context')\n\n//Whether WebAudioAPI AudioBuffer should be created, if avail, instead of polyfilled structure\nAudioBuffer.isWAA = true\n```\n\n## See also\n\n* [audio-buffer-utils](https://github.com/audiojs/audio-buffer-utils) â utils for audio buffers\n* [pcm-util](https://npmjs.org/package/pcm-util) â utils for audio format convertions.\n\n## Similar\n\n* [ndsamples](https://github.com/livejs/ndsamples) â audio-wrapper for ndarrays. A somewhat alternative approach to wrap audio data, based on ndarrays, used by some modules in [livejs](https://github.com/livejs).\n* [1](https://www.npmjs.com/package/audiobuffer), [2](https://www.npmjs.com/package/audio-buffer), [3](https://github.com/sebpiq/node-web-audio-api/blob/master/lib/AudioBuffer.js), [4](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) â other AudioBuffer implementations.\n* [audiodata](https://www.npmjs.com/package/audiodata) alternative data holder from @mohayonao.\n"},{"name":"audiojs/audio-oscillator","link":"https://github.com/audiojs/audio-oscillator","stars":6,"readme":"# audio-oscillator [![Build Status](https://travis-ci.org/audiojs/audio-oscillator.svg?branch=master)](https://travis-ci.org/audiojs/audio-oscillator) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nOscillate some periodic wave into stream. [OscillatorNode](http://webaudio.github.io/web-audio-api/#the-oscillatornode-interface) in stream land.\n\n## Usage\n\n[![$ npm install audio-oscillator](http://nodei.co/npm/audio-oscillator.png?mini=true)](http://npmjs.org/package/audio-oscillator)\n\n```js\nvar Oscillator = require('audio-oscillator');\nvar Speaker = require('audio-speaker');\nvar Slice = require('audio-slice');\n\nOscillator({\n\t//in hz\n\tfrequency: 440,\n\n\t//in cents\n\tdetune: 0,\n\n\t//sine, triangle, square, saw, pulse, wave\n\ttype: 'sine',\n\n\t//normalize result of `wave` type\n\tnormalize: true\n})\n.pipe(Slice(1))\n.pipe(Speaker());\n\n\n//Set periodic wave from arrays of real and imaginary coefficients\noscillator.setPeriodicWave(real, imag);\n```\n\n## Related\n\n> [audio-generator](https://github.com/audiojs/audio-generator) â generate audio stream with a function.<br/>\n> [audio-speaker](https://github.com/audiojs/audio-speaker) â output audio stream to speaker in node/browser.<br/>\n> [web-audio-stream](https://github.com/audiojs/web-audio-stream) â stream to web-audio node.<br/>\n"},{"name":"audiojs/audio-speaker","link":"https://github.com/audiojs/audio-speaker","stars":33,"readme":"#audio-speaker [![Build Status](https://travis-ci.org/audiojs/audio-speaker.svg?branch=master)](https://travis-ci.org/audiojs/audio-speaker) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nOutput audio stream to speaker in node or browser.\n\n[![npm install audio-speaker](https://nodei.co/npm/audio-speaker.png?mini=true)](https://npmjs.org/package/audio-speaker/)\n\n\n### Use as a stream\n\n```js\nvar Speaker = require('audio-speaker/stream');\nvar Generator = require('audio-generator/stream');\n\nGenerator(function (time) {\n\t//panned unisson effect\n\tvar Ï = Math.PI * 2;\n\treturn [Math.sin(Ï * time * 441), Math.sin(Ï * time * 439)];\n})\n.pipe(Speaker({\n\t//PCM input format defaults, optional.\n\t//channels: 2,\n\t//sampleRate: 44100,\n\t//byteOrder: 'LE',\n\t//bitDepth: 16,\n\t//signed: true,\n\t//float: false,\n\t//interleaved: true,\n}));\n```\n\n### Use as a pull-stream\n\n```js\nconst pull = require('pull-stream/pull');\nconst speaker = require('audio-speaker/pull');\nconst osc = require('audio-oscillator/pull');\n\npull(osc({frequency: 440}), speaker());\n```\n\n### Use directly\n\nSpeaker is [async-sink](https://github.com/audiojs/contributing/wiki/Streams-convention) with `fn(data, cb)` notation.\n\n```js\nconst createSpeaker = require('audio-speaker');\nconst createGenerator = require('audio-generator');\n\nlet output = createSpeaker();\nlet generate = createGenerator(t => Math.sin(t * Math.PI * 2 * 440));\n\n(function loop (err, buf) {\n\tlet buffer = generate();\n\toutput(buffer, loop);\n})();\n```\n\n#### Related\n\n> [web-audio-stream](https://github.com/audiojs/web-audio-stream) â stream data to web-audio.<br/>\n> [audio-through](http://npmjs.org/package/audio-through) â universal stream for processing audio.<br/>\n> [node-speaker](http://npmjs.org/package/speaker) â output pcm stream to speaker in node.<br/>\n> [audio-feeder](https://github.com/brion/audio-feeder) â cross-browser speaker for pcm data.<br/>\n"},{"name":"audiojs/audio-sink","link":"https://github.com/audiojs/audio-sink","stars":5,"readme":"# audio-sink [![Build Status](https://travis-ci.org/audiojs/audio-sink.svg?branch=master)](https://travis-ci.org/audiojs/audio-sink) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nTriggers an event for received audio chunk and releases the data. If piped to somewhere, it turns into a pass-throught stream. That way, it is [through2-sink](https://www.npmjs.com/package/through2-sink) and [tap-stream](https://www.npmjs.com/package/tap-stream) in one. Use as a fast replacement for [audio-speaker](https://npmjs.org/package/audio-speaker) or [audio-render](https://npmjs.org/package/audio-render).\n\nCan function as a pressure controller. See example.\n\n## Usage\n\n[![npm install audio-sink](https://nodei.co/npm/audio-sink.png?mini=true)](https://npmjs.org/package/audio-sink/)\n\n#### Direct\n\n```js\nconst Sink = require('audio-sink/direct');\n\nlet sink = Sink((data, cb) => {\n\tconsole.log(data);\n\tsetTimeout(cb, 100);\n});\n\n//log data and invoke cb after 100ms\nsink(buffer, (err, buffer) => {\n\n});\n```\n\n#### Pull-stream\n\n```js\nconst pull = require('pull-stream/pull');\nconst sink = require('audio-sink/pull');\nconst generator = require('audio-generator/pull');\n\n//stream generated data to sink with pressure control\npull(\n\tgenerator(time => Math.sin(time * Math.PI * 2 * 440)),\n\tsink((data, cb) => {\n\t\t//end stream if needed\n\t\tif (tooLate) return cb(true);\n\n\t\tconsole.log(data);\n\t\tsetTimeout(cb, 100);\n\t});\n);\n```\n\n#### Stream\n\n```js\nvar Gen = require('audio-generator/stream');\nvar Sink = require('audio-sink/stream');\n\nGen(function (time) {\n\treturn time ? 0 : 1;\n})\n.pipe(Sink(function (data, cb) {\n\tconsole.log('This sink is a pass-through with 10ms throttling ', data.length);\n\n\tsetTimeout(cb, 10);\n}))\n.pipe(Sink(function (data) {\n\tconsole.log('This sink gets the data and releases it ', data.length);\n}));\n```\n\n## Related\n\n> [stream-sink](https://www.npmjs.com/package/stream-sink) â universal stream sink.<br/>\n> [through2-sink](https://www.npmjs.com/package/through2-sink) â triggers an event for the data chunk, but does not pass data through.<br/>\n> [tap-stream](https://www.npmjs.com/package/tap-stream) â triggers callback for the passed through data, but does not release data.\n"},{"name":"audiojs/audio-generator","link":"https://github.com/audiojs/audio-generator","stars":12,"readme":"# audio-generator [![Build Status](https://travis-ci.org/audiojs/audio-generator.svg?branch=master)](https://travis-ci.org/audiojs/audio-generator) [![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)\n\nGenerate audio stream with a function.\n\n## Usage\n\n[![npm install audio-generator](https://nodei.co/npm/audio-generator.png?mini=true)](https://npmjs.org/package/audio-generator/)\n\n#### Direct\n\n```js\nconst generator = require('audio-generator');\nconst speaker = require('audio-speaker');\n\n// panned sine generator\nlet generate = generator(time => [\n\t\tMath.sin(Math.PI * 2 * time * 439), //channel 1\n\t\tMath.sin(Math.PI * 2 * time * 441), //channel 2\n\t], { duration: 2 });\nlet write = speaker();\n\n// hook up generator â speaker loop\n(function loop () {\n\twrite(generate(), loop);\n})();\n```\n\n#### Pull stream\n\n```js\nvar generator = require('audio-generator/pull');\nvar speaker = require('audio-speaker/pull');\nvar pull = require('pull-stream/pull');\n\npull(\n\tgenerator(Math.random, { duration: 2 }),\n\tspeaker()\n);\n```\n\n#### Node stream\n\n```js\nvar Generator = require('audio-generator/stream');\nvar Speaker = require('audio-speaker/stream');\n\nGenerator(\n\t//Generator function, returns sample values -1..1 for channels\n\tfunction (time) {\n\t\treturn [\n\t\t\tMath.sin(Math.PI * 2 * time * 439), //channel 1\n\t\t\tMath.sin(Math.PI * 2 * time * 441), //channel 2\n\t\t]\n\t},\n\n\t{\n\t\t//Duration of generated stream, in seconds, after which stream will end.\n\t\tduration: Infinity,\n\n\t\t//Periodicity of the time.\n\t\tperiod: Infinity\n})\n.on('error', function (e) {\n\t//error happened during generation the frame\n})\n.pipe(Speaker());\n```\n\n## Related\n\n> [audio-through](http://npmjs.org/package/audio-through) â universal audio processing stream.<br/>\n> [audio-speaker](http://npmjs.org/package/audio-speaker) â output audio stream to speaker, both in node/browser.<br/>\n> [baudio](http://npmjs.org/package/baudio), [webaudio](http://npmjs.org/package/webaudio) â alternative audio generators.\n"},{"name":"audiojs/audio-gain","link":"https://github.com/audiojs/audio-gain","stars":6,"readme":"# audio-gain [![Build Status](https://travis-ci.org/audiojs/audio-gain.svg?branch=master)](https://travis-ci.org/audiojs/audio-gain) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\n> PCM audio gain as function, stream, pull stream, etc.\n\n_Audio-gain_ is a transform stream to change the volume of audio data. It includes `audio-gain` module with class itself, an `<audio-gain>` custom element to use in a browser, and a `gain` command to use in a terminal.\n\n## Usage\n\n[![npm install audio-gain](https://nodei.co/npm/audio-gain.png?mini=true)](https://npmjs.org/package/audio-gain/)\n\n#### Plain function\n\n```js\nconst generator = require('audio-generator');\nconst gain = require('audio-gain');\nconst speaker = require('audio-speaker');\n\n// Create functions\nlet generate = generator({ duration: 2 });\nlet gain = gain({ volume: .5});\nlet write = speaker();\n\n// Hook up generator â gain â speaker routine\n(function loop (error) {\n\tlet buffer = generate();\n\tbuffer = gain(buffer);\n\twrite(buffer, loop);\n})();\n```\n\n#### Node stream\n\n```js\nvar Generator = require('audio-generator/stream');\nvar Gain = require('audio-gain/stream');\nvar Speaker = require('audio-speaker/stream');\n\nvar generator = Generator({ duration: 2 });\nvar gain = Gain(0.5);\nvar speaker = Speaker();\n\ngenerator.pipe(gain).pipe(speaker);\n```\n\n#### Pull-stream\n\n```js\nvar generator = require('audio-generator/pull');\nvar gain = require('audio-gain/pull');\nvar speaker = require('audio-speaker/pull');\nvar pull = require('pull-stream/pull');\n\npull(\n\tgenerator(Math.random, { duration: 2 }),\n\tgain({ volume: .4 }),\n\tspeaker()\n);\n```\n\n<!--\nCustom element:\n\n```html\n<script src=\"./bundled-dependencies.js\"></script>\n<link rel=\"import\" href=\"node_modules/audio-speaker\">\n<link rel=\"import\" href=\"node_modules/audio-generator\">\n<link rel=\"import\" href=\"node_modules/audio-gain\">\n\n<audio-generator id=\"generator\" connect=\"#gain\"></audio-generator>\n<audio-gain volume=\"0.3\" id=\"gain\" connect=\"#speaker\"></audio-gain>\n<audio-speaker id=\"speaker\"></audio-speaker>\n```\n\nCommand:\n\n```sh\n$ cat sample.wav | gain --volume 0.5 | speaker\n```\n-->\n\n## Related\n\n> [audio-generator](https://github.com/audiojs/audio-generator) â generate stream with a function.<br/>\n> [audio-speaker](https://github.com/audiojs/audio-speaker) â output stream to node/browser speaker.<br/>\n> [GainNode](https://developer.mozilla.org/en-US/docs/Web/API/GainNode) â gain node in web-audio-api.</br>\n> [pcm-volume](https://npmjs.org/package/pcm-volume) â similar package, volume is taken as tangential.</br>\n"},{"name":"audiojs/audio-through","link":"https://github.com/audiojs/audio-through","stars":13,"readme":"# audio-through [![Build Status](https://travis-ci.org/audiojs/audio-through.svg?branch=master)](https://travis-ci.org/audiojs/audio-through) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nThrough stream for audio processing.\n\n* Compatible with PCM streams (node streams).\n* Can be piped right to [speaker](https://npmjs.org/package/speaker).\n* Shares _AudioBuffer_ between connected instances instead of copying _Buffer_, which is 0 performance hit / memory churn.\n* Uses zero-watermarks to avoid output delays.\n* Provides an easy way to control the flow pressure, e. g. to bind processing to real time, debug chunks, outsource processing to shaders/webworkers/audio-workers, etc.\n* Provides debugging facilities.\n* Provides simple audio data metrics.\n* Can be used as a _Readable_, _Transform_ or _Writable_ stream.\n* WIP: .plan method to schedule events by audio-time.\n\n\n## Usage\n\n[![npm install audio-through](https://nodei.co/npm/audio-through.png?mini=true)](https://npmjs.org/package/audio-through/)\n\n```js\nvar Through = require('audio-through');\nvar util = require('audio-buffer-utils');\nvar Speaker = require('speaker');\n\nvar through = new Through(function (buffer) {\n    if (this.time > 3) return this.end();\n\n    //decrease volume\n    var volume = 0.2;\n\n    util.fill(buffer, function (sample) {\n        return sample * volume;\n    });\n});\n\n//Pipe to/from stream\nthrough.pipe(Speaker());\n```\n\n## API\n\n### `new Through(process, options?)`\n\nThrough constructor takes `process` function and `options` arguments.\n\nProcessor function receives `buffer` and optional `done` callback, and is expected to modify buffer or return a new one.\n\n```js\nvar through = new Through(function (buffer, done) {\n    //...process buffer\n\n    done(null, buffer);\n});\n```\n\nArgument `buffer` is an instance of _AudioBuffer_, used as input-output. It is expected to be modified in-place to avoid \"memory churn\". Still, if a new buffer is returned then it will be used instead of the `buffer`.\n\nCallback argument can be omitted, in that case processor does not hold stream and releases data instantly, like a sink. (The pattern reminisce mocha tests.). If callback argument is present, stream will wait till callbackâs invocation.\nCallback receives two arguments â `done(error, data)`, default node callbacks convention.\n\n### `options`\n\n```js\n{\n    //act as a generator readable stream if connected outwards but not connected inwards\n    generator: true,\n\n    //act as a sink writable stream if not connected outwards but connected inwards\n    sink: true,\n\n    //pcm options, in case if connected to raw output stream\n    sampleRate: 44100,\n    channels: 2,\n    samplesPerFrame: 1024\n}\n```\n\n### `through.count`\n\nNumber of processed samples.\n\n### `through.frame`\n\nNumber of processed frames (chunks).\n\n### `through.time`\n\nTime of the beginning of the next chunk, in seconds.\n\n### `through.on(evt, function (buffer) {})`\n\nBind hook to processing event: `beforeProcess` or `afterProcess`. You can perform additional buffer modifications, if required.\n\n### `through.end()`\n\nEnd stream, can be called from within processing function or outside.\n\n### `through.error(error|string)`\n\nThrow error, not breaking the pipe.\n\n### `through.log(string);`\n\nLogging per-instance with timestamps.\n\n### Connecting to Web Audio\n\nIf you need to output stream to web audio â use whether [web-audio-stream](https://github.com/audiojs/web-audio-stream) or [audio-speaker](https://github.com/audiojs/audio-speaker).\n\n## Related\n\n> [audio-generator](https://github.com/audiojs/audio-generator) â audio signal generator stream.<br/>\n> [audio-speaker](https://github.com/audiojs/audio-speaker) â output audio stream in browser/node.<br/>\n> [audio-shader](https://github.com/audiojs/audio-shader) â shader-based audio processing stream.<br/>\n> [audio-buffer](https://github.com/audiojs/audio-buffer) â audio data holder.<br/>\n> [audio-buffer-utils](https://npmjs.org/package/audio-buffer-utils) â set of utils for audio buffers processing.<br/>\n> [pcm-util](https://npmjs.org/package/pcm-util) â utils for low-level pcm stream tasks.<br/>\n> [web-audio-stream](https://github.com/audiojs/web-audio-stream) â output stream to web audio.</br>\n"},{"name":"audiojs/audio-slice","link":"https://github.com/audiojs/audio-slice","stars":4,"readme":"# audio-slice [![Build Status](https://travis-ci.org/audiojs/audio-slice.svg?branch=master)](https://travis-ci.org/audiojs/audio-slice) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nSlice input audio stream to the duration, i. e. sound after N seconds will not be played and stream will end. Useful to force input stream to end.\n\n## Usage\n\n[![npm install audio-slice](https://nodei.co/npm/audio-slice.png?mini=true)](https://npmjs.org/package/audio-slice/)\n\n```js\nvar Sine = require('audio-oscillator/sine');\nvar Slice = require('audio-slice');\nvar Speaker = require('audio-speaker');\n\nGenerator().pipe(Slice(2)).pipe(Speaker());\n```\n"},{"name":"audiojs/audio-biquad","link":"https://github.com/audiojs/audio-biquad","stars":8,"readme":"# audio-biquad [![Build Status](https://travis-ci.org/audiojs/audio-biquad.svg?branch=master)](https://travis-ci.org/audiojs/audio-biquad) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nBiquad filter stream. API is similar to [BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode).\n\n[![npm install audio-biquad](https://nodei.co/npm/audio-biquad.png?mini=true)](https://npmjs.org/package/audio-biquad/)\n\n\n```js\nvar BiquadFilter = require('audio-biquad');\nvar Speaker = require('audio-speaker');\nvar Generator = require('audio-generator');\n\nGenerator(function () {\n\treturn Math.random() * 2 - 1;\n}, {\n\tduration: 2\n})\n.pipe(BiquadFilter({\n\ttype: 'bandpass',\n\tfrequency: 440,\n\tQ: 100,\n\tgain: 25\n}))\n.pipe(Speaker());\n```\n\n> [BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode) â all the options for the filters.</br>\n> [BiquadFilterNode chromium source](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/platform/audio/Biquad.cpp&rcl=1443871507&l=283) â source code inspiration.</br>\n> [EQ Cookbook](http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt) â description of all the kinds of filters.</br>\n"},{"name":"audiojs/audio-play","link":"https://github.com/audiojs/audio-play","stars":4,"readme":"# audio-play [![Build Status](https://travis-ci.org/audiojs/audio-play.svg?branch=master)](https://travis-ci.org/audiojs/audio-play) [![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)\n\nPlay [audio buffer](https://github.com/audiojs/audio-buffer), browser/node-wise.\n\n## Usage\n\n[![npm install audio-play](https://nodei.co/npm/audio-play.png?mini=true)](https://npmjs.org/package/audio-play/)\n\n```js\nconst play = require('audio-play');\nconst load = require('audio-loader');\nconst context = require('audio-context');\n\nload('./sample.mp3').then(play);\n```\n\n## API\n\n```js\nconst play = require('audio-play');\n\n//play audio buffer with possible options\nlet pause = play(audioBuffer, {\n\t//start/end time, can be negative to measure from the end\n\tstart: 0,\n\tend: audioBuffer.duration,\n\n\t//repeat playback within start/end\n\tloop: false,\n\n\t//playback rate\n\trate: 1,\n\n\t//fine-tune of playback rate, in cents\n\tdetune: 0,\n\n\t//volume\n\tvolume: 1,\n\n\t//possibly existing audio-context, not necessary\n\tcontext: require('audio-context'),\n\n\t//start playing immediately\n\tautoplay: true\n}, onend?);\n\n//pause/continue playback\nplay = pause();\npause = play();\n\n//or usual way\nlet playback = play(buffer, opts?, cb?);\nplayback.pause();\nplayback.play();\n\n//get played time\nplayback.currentTIme;\n```\n\n### Related\n\n* [audio-loader](https://github.com/danigb/audio-loader) â load AudioBuffer from any audio source.\n"},{"name":"audiojs/audio-pcm-format","link":"https://github.com/audiojs/audio-pcm-format","stars":6,"readme":"[![npm install audio-pcm-format](https://nodei.co/npm/audio-pcm-format.png?mini=true)](https://npmjs.org/package/audio-pcm-format/)\n\n```js\nvar PcmFormat = require('audio-pcm-format');\nvar Speaker = require('node-speaker');\n\n\n/** Transform input format to output format */\nmyStream.pipe(PcmFormat(inputFormat, outputFormat?)).pipe(Speaker());\n\n\n/** Default output/input format, extended with passed formats. Redefine if needed. */\nPcmFormat.default === {\n\t//number or order of channels, if array, e. g. [0, 1] â [1, 0]\n\tchannels: 2,\n\n\t//single sample params\n\tbyteOrder: 'LE',\n\tbitDepth: 16,\n\tsigned: true,\n\tfloat: false,\n\n\t//the way to read/write input/output samples: [LRLRLRLR] or [LLLLRRRR]\n\tinterleaved: true,\n\n\t//force output chunk size\n\tsamplesPerFrame: undefined\n};\n\n\n```\n\n> **Related**<br/>\n> [pcm-util](https://npmjs.org/package/pcm-util) â utils for pcm transforms.<br/>\n> [pcm-format](https://npmjs.org/package/pcm-format) â transforms pcm stream per sample.<br/>"},{"name":"audiojs/audio-table","link":"https://github.com/audiojs/audio-table","stars":7,"readme":"Collection of common periodic audio signals.\n\n[![npm install audio-table](https://nodei.co/npm/audio-table.png?mini=true)](https://npmjs.org/package/audio-table/)\n\n```js\nvar table = require('audio-table');\n\n//get Float32Array of the length 1024 of the pure sine wave\nvar sin = table.sin(1024);\nsin[0] === 0;\nsin[256] === 1;\nsin[512] === 0;\n\n//API\ntable.<waveshape>( list|length, args... );\n\n//signals\ntable.sin(list|length);\ntable.cos(list|length);\ntable.noise(list|length);\ntable.delta(list|length);\ntable.pulse(list|length, dutyRatio);\ntable.square(list|length); // table.pulse(list|length, 0.5);\ntable.triangle(list|length, scale);\ntable.saw(list|length); //table.triangle(length, 0);\n```\n\n### Related\n\n> [audio-buffer-utils](https://npmjs.org/package/audio-buffer-utils) â same functions but for audio buffers.<br/>\n> [Periodic functions](https://en.wikipedia.org/wiki/List_of_periodic_functions) â list of periodic functions on wiki.<br/>"},{"name":"audiojs/audio-lena","link":"https://github.com/audiojs/audio-lena","stars":3,"readme":"# audio-lena [![Build Status](https://travis-ci.org/audiojs/audio-lena.svg?branch=master)](https://travis-ci.org/audiojs/audio-lena) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nThe [Lena](https://www.freesound.org/people/heshamwhite/sounds/246148/) test audio. Returns _ArrayBuffer_ with mp3 or wav of the record.\n\n## Usage\n\n[![npm install audio-lena](https://nodei.co/npm/audio-lena.png?mini=true)](https://npmjs.org/package/audio-lena/)\n\n```js\n//wav file\nconst lena = require('audio-lena/wav');\nconst context = require('audio-context');\n\ncontext.decodeAudioData(lena, (buffer) => {\n\tsource = context.createBufferSource();\n\tsource.buffer = buffer;\n\tsource.connect(context.destination);\n\tsource.loop = true;\n\n\tsource.start();\n});\n\n//array buffer\nconst buf = require('audio-lena/buffer');\nconst AudioBuffer = require('audio-buffer');\n\n//note mono channel indicator    â\nlet lenaBuffer = new AudioBuffer(1, buf);\n\n\n//also available mp3\nconst mp3 = require('audio-lena/mp3');\n```\n\n## Why\n\nPerfect size (1Mb), length (12s), noisy background, visible spectral peaks with harmonics, pitch variation, mono (not default number of channels). Good for sound recovery, sfx, filtering, decoding, encoding etc.\n\n## Credits\n\nThanks to **[@mikolalysenko](https://github.com/mikolalysenko)** for API insight and [freesound.org](https://www.freesound.org) for awesome collection of opensource sounds.\n\n## Reference\n\n* [Lenna](https://en.wikipedia.org/wiki/Lenna) in wiki.\n* [Lena.mp3](https://www.freesound.org/people/heshamwhite/sounds/246148/) original.\n* [Lena](https://github.com/mikolalysenko/lena) test image.\n"},{"name":"audiojs/audio-decode","link":"https://github.com/audiojs/audio-decode","stars":1,"readme":"# audio-decode [![Build Status](https://travis-ci.org/audiojs/audio-decode.svg?branch=master)](https://travis-ci.org/audiojs/audio-decode) [![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)\n\nConvert _ArrayBuffer_ with audio encoded in any format to [AudioBuffer](https://github.com/audiojs/audio-buffer). Basically [context.decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/decodeAudioData) for node and browser.\n\n[![npm install audio-decode](https://nodei.co/npm/audio-decode.png?mini=true)](https://npmjs.org/package/audio-decode/)\n\n```js\nconst decode = require('audio-decode');\nconst buffer = require('audio-lena');\nconst context = require('audio-context');\n\n//as a callback\ndecode(buffer, {context: context}, (err, audioBuffer) => {});\n\n//as a promise\ndecode(buffer, {context: context}).then(audioBuffer => {}, err => {});\n```\n\n## API\n\n**`let promise = decode(arrayBuffer, options?, callback?)`**\n\nDecode array buffer, based on options maybe and pass data to the callback when done, or resolve a promise if no callback passed.\n\nPossible options may include `context` property for web-audio-api context. If not defined, the [audio-context](https://npmjs.org/package/audio-context) will be used.\n\n## Supported formats\n\nShipped by default:\n\n* [x] _wav_ via [wav-decoder](https://github.com/mohayonao/wav-decoder)\n* [x] _mp3_ via [aurora mp3](https://github.com/audiocogs/mp3.js)\n\nAdditional formats:\n\n* _flac_ via [flac.js](https://github.com/audiocogs/flac.js)\n* _alac_ via [alac.js](https://github.com/audiocogs/alac.js)\n* _aac_ via [aac.js](https://github.com/audiocogs/aac.js)\n\nTo enable additional format, install it as a dependency `npm install --save flac.js` and require once `require('flac.js')`.\n\n\n## Credits\n\n* [@mohayonao](https://github.com/mohayonao/) for [wav-decoder](https://github.com/mohayonao/wav-decoder).\n* [@devongovett](https://github.com/devongovett) and [@jensnockert](https://github.com/jensnockert) for [aurora.js](https://github.com/audiocogs/aurora.js).\n* [@jamen](https://github.com/jamen) as originator of this package.\n\n"},{"name":"audiojs/audio-source","link":"https://github.com/audiojs/audio-source","stars":1,"readme":"[![Build Status](https://travis-ci.org/audiojs/audio-source.svg?branch=master)](https://travis-ci.org/audiojs/audio-source) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nCreate audio stream from _AudioBuffer_ or _ArrayBuffer_.\n\n## Usage\n\n[![npm install audio-source](https://nodei.co/npm/audio-source.png?mini=true)](https://npmjs.org/package/audio-source/)\n\n#### As a function\n\nAudio-source in functional style is a [sync source](https://github.com/audiojs/contributing/wiki/Streams-convention).\n\n```js\nconst Source = require('audio-source');\nconst Speaker = require('audio-speaker/direct');\nconst lena = require('audio-lena/buffer');\n\nlet read = Source(lena, {channels: 1});\nlet write = Speaker({channels: 1});\n\n//create and start reading loop\n(function again (err, buf) {\n\t//get next chunk\n\tbuf = read(buf);\n\n\t//catch end\n\tif (!buf) return;\n\n\t//send chunk to speaker\n\twrite(buf, again);\n})();\n```\n\n#### As a pull-stream\n\n[Pull-streams](https://github.com/pull-stream/pull-stream) are awesome and [faster than streams](https://github.com/dfcreative/stream-contest) (but slower than plain fn).\n\n```js\nconst pull = require('pull-stream/pull');\nconst Source = require('audio-source/pull');\nconst Speaker = require('audio-speaker/pull');\nconst lena = require('audio-lena/buffer');\n\nlet source = Source(lena, {channels: 1});\nlet sink = Speaker({channels: 1});\n\npull(source, sink);\n```\n\n#### As a stream\n\nStreams are concise:\n\n```js\nconst Source = require('audio-source/stream');\nconst Speaker = require('audio-speaker/stream');\nconst lena = require('audio-lena/buffer');\n\nSource(lena).pipe(Speaker());\n```\n\n### API\n\n```js\nconst Source = require('audio-source');\n\n//create source reader\nlet read = Source(audioBuffer, {channels: 2, loop: false}?, endCallback?);\n\n//get next chunk of audio data\nlet chunk = read();\n\n//dispose stream\nread.end();\n```\n\n## Related\n\n> [web-audio-stream](https://github.com/audio-lab/web-audio-stream) â connect WebAudio to audio-stream or audio-stream to WebAudio.\n"},{"name":"audiojs/audio-loader","link":"https://github.com/audiojs/audio-loader","stars":7,"readme":"# audio-loader [![npm](https://img.shields.io/npm/v/audio-loader.svg)](https://www.npmjs.com/package/audio-loader)\n\n[![Build Status](https://travis-ci.org/danigb/audio-loader.svg?branch=master)](https://travis-ci.org/danigb/audio-loader) [![Code Climate](https://codeclimate.com/github/danigb/audio-loader/badges/gpa.svg)](https://codeclimate.com/github/danigb/audio-loader) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard) [![license](https://img.shields.io/npm/l/audio-loader.svg)](https://www.npmjs.com/package/audio-loader)\n\nAn simple and flexible audio buffer loader for browser and node:\n\n```js\nvar load = require('audio-loader')\n\n// load one file\nload('http://example.net/audio/file.mp3').then(function (buffer) {\n  console.log(buffer) // => <AudioBuffer>\n})\n\n// load a collection of files\nload({ snare: 'samples/snare.wav', kick: 'samples/kick.wav' },\n  { from: 'http://example.net/'} ).then(function (audio) {\n  console.log(audio) // => { snare: <AudioBuffer>, kick: <AudioBuffer> }\n})\n```\n\n## Features\n\n- Load single audio files or collection of them (either using arrays or data objects)\n- Load base64 encoded audio strings\n- Compatible with midi.js pre-rendered soundfonts packages like [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts/tree/master/MusyngKite)\n- Compatible with json encoded audio like [sampled](https://github.com/danigb/sampled)\n\n##Â Install\n\n__Npm__\n\nVia npm: `npm i --save audio-loader`\n\n__Browser__\n\nDownload the [minified distribution](https://raw.githubusercontent.com/danigb/audio-loader/master/dist/audio-loader.min.js) (4kb) which exports `loadAudio` as window global:\n\n```html\n<script src=\"audio-loader.min.js\"></script>\n<script>\n  loadAudio('file.wav').then(..)\n</script>\n```\n\n## Usage\n\n<a name=\"load\"></a>\n\n#### Load audio files\n\nYou can load individual or collection of files:\n\n```js\nload('http://path/to/file.mp3').then(function (buffer) {\n  // buffer is an AudioBuffer\n  play(buffer)\n})\n\n// apply a prefix using options.from\nload(['snare.mp3', 'kick.mp3'], { from: 'http://server.com/audio/' }).then(function (buffers) {\n  // buffers is an array of AudioBuffers\n  play(buffers[0])\n})\n\n// the options.from can be a function\nfunction toUrl (name) { return 'http://server.com/samples' + name + '?key=secret' }\nload({ snare: 'snare.mp3', kick: 'kick.mp3' }, { from: toUrl }).then(function (buffers) {\n  // buffers is a hash of names to AudioBuffers\n  play(buffers['snare'])\n})\n```\n\n#### Recursive loading\n\n`audio-loader` will detect if some of the values of an object is an audio file name and try to fetch it:\n\n```js\nvar inst = { name: 'piano', gain: 0.2, audio: 'samples/piano.mp3' }\nload(inst).then(function (piano) {\n  console.log(piano.name) // => 'piano' (it's not an audio file)\n  console.log(piano.gain) // => 0.2 (it's not an audio file)\n  console.log(piano.audio) // => <AudioBuffer> (it loaded the file)\n})\n```\n\n#### Load soundfont files\n\nIf you provide a `.js` file, `audio-loader` will interpret it as a [midi.js](https://github.com/mudcube/MIDI.js) soundfont file and try to load it:\n\n```js\nload('acoustic_grand_piano-ogg.js').then(function (buffers) {\n  buffers['C2'] // => <AudioBuffer>\n})\n```\n\nThis is a repository of them: https://github.com/gleitz/midi-js-soundfonts\n\n#### API\n### `load(source, [options])`\n\n| Param | Type | Description |\n| --- | --- | --- |\n| source | <code>Object</code> | the object to be loaded: can be an URL string, ArrayBuffer with encoded data or an array/map of sources |\n| options | <code>Object</code> | (Optional) the load options for that source |\n\nPossible `options` keys are:\n\n- __from__ {Function|String}: a function or string to convert from file names to urls.\nIf is a string it will be prefixed to the name:\n`load('snare.mp3', { from: 'http://audio.net/samples/' })`\nIf it's a function it receives the file name and should return the url as string.\n- __only__ {Array} - when loading objects, if provided, only the given keys\nwill be included in the decoded object:\n`load('piano.json', { only: ['C2', 'D2'] })`\n- __context__ {AudioContext}: (browser only) The audio context to use. By default uses [`audio-context`](https://www.npmjs.com/package/audio-context)\n- __decode__ {Function}: a function to decode audio. It receives a buffer and must return a promise to an audio buffer.\n- __fetch__ {Function}: a function to fetch files. It receives an url and a response type (one of 'arraybuffer' or 'text') and must return a promise to the contents\n\n## Run tests and examples\n\nTo run the test, clone this repo and:\n\n```bash\nnpm install\nnpm test\n```\n\nTo run the browser example:\n\n```bash\nnpm i -g budo\nnpm run example-browser\n```\n\nTo run the node (audiojs) example:\n\n```bash\nnode example/node.js\n```\n\n## License\n\nMIT License\n"},{"name":"audiojs/audio-mpg123","link":"https://github.com/audiojs/audio-mpg123","stars":4,"readme":"# audio-mpg123\n\n> A native node binding to write raw PCM data to an OS driver.\n\nThis is a pure native node binding for the library mpg123. This is used particularly with audio-speaker\nwhich provides a nice API over this native binding to play audio. \n\n**It is highly recommended you use audio-speaker if you are looking for a way to play audio. Please\nlook at [audio-speaker][speaker-link] before using this module.**\n\n## Install\n\nBasic install (pre-built): `npm install audio-mpg123`\n \n*Advanced install is not recommended at this time as it is difficult to use at production.\nWe are working on a fix for this.*\n\n## Support\n\nOut123 Version: 2\n\nThe following device support table below only applies to those wanting the pre-built binary.\n\n|      Operating System       |             Node             |            Arch             |          Driver             |\n| :-------------------------: | :--------------------------: | :-------------------------: | :-------------------------: |\n|          Windows            |        4.x, 6.x, 7.x         |            x64              |           win32             |\n|           Linux             |      4.x, 5.x, 6.x, 7.x      |            x64              |           alsa              |\n\nIt is important to note that if you need support other than what's in this table, it is\npossible to build the binary yourself.\n\nNOTE: Windows, Linux and MacOS are currently the only supported operating systems. \nWe are unable to provide a prebuilt binary for Windows ia32 and MacOS x64 at this time and when you install the module,\nyou will need build tools to build it yourself.\n\n## Credits\n\n| ![connor][connor-avatar]      | ![jamen][jamen-avatar]       |\n| :---------------------------: | :---------------------------: |\n| [Connor Hartley][connor-link] | [Jamen Marz][jamen-link]      |\n\n  [speaker-link]: https://github.com/audiojs/audio-speaker\n\n  [connor-avatar]: https://avatars0.githubusercontent.com/u/12867785?v=3&s=125\n  [connor-link]: https://github.com/connorhartley\n  [jamen-avatar]: https://avatars.githubusercontent.com/u/6251703?v=3&s=125\n  [jamen-link]: https://github.com/jamen\n"},{"name":"audiojs/web-audio-stream","link":"https://github.com/audiojs/web-audio-stream","stars":15,"readme":"[![Build Status](https://travis-ci.org/audiojs/web-audio-stream.svg?branch=master)](https://travis-ci.org/audiojs/web-audio-stream) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nInterface between Web Audio API and streams. Send PCM data to Web Audio API (writable mode) or connect any AudioNode to stream (readable mode).\n\n## Usage\n\n[![npm install web-audio-stream](https://nodei.co/npm/web-audio-stream.png?mini=true)](https://npmjs.org/package/web-audio-stream/)\n\n```js\nconst context = require('audio-context');\nconst Generator = require('audio-generator');\nconst {Readable, Writable} = require('web-audio-stream');\n\nlet oscillator = context.createOscillator();\noscillator.type = 'sawtooth';\noscillator.frequency.value = 440;\noscillator.start();\n\n//pipe oscillator audio data to stream\nReadable(oscillator).on('data', (audioBuffer) => {\n\tconsole.log(audioBuffer.getChannelData(0));\n});\n\n//pipe generator stream to audio destination\nGenerator(time => Math.sin(Math.PI * 2 * time * 440))\n.pipe(Writable(context.destination));\n```\n\n\n## API\n\n<details><summary>**`const {Readable, Writable} = require('web-audio-stream');`**</summary>\n\nRequire stream instance, by default writable. Or require separate streams:\n\n```js\n//web-audio â stream\nconst Readable = require('web-audio-stream/readable');\n\n//stream â web-audio\nconst Writable = require('web-audio-stream/writable');\n```\n</details>\n\n<details><summary>**`let writable = Writable(audioNode, options?)`**</summary>\n\nCreate writer to web audio node, possibly based on options.\n\n```js\nvar Writable = require('web-audio-stream/writable');\nvar context = require('audio-context');\n\n//options or single properties are optional\nvar writable = Writable(context.destination, {\n\t//context: context,\n\t//channels: 2,\n\t//sampleRate: context.sampleRate,\n\n\t//BUFFER_MODE, SCRIPT_MODE, WORKER_MODE (pending web-audio-workers)\n\tmode: Writable.BUFFER_MODE,\n\n\t//disconnect node if input stream ends\n\tautoend: true\n});\n```\n</details>\n<details><summary>**`stream.pipe(writable);`**</summary>\n\nPipe stream to writable, or write data directly to it etc, basically it implements _Writable_ stream class.\n\n```js\n//as a stream\nvar Generator = require('audio-generator');\nvar src = Generator(function (time) {\n\treturn Math.sin(Math.PI * 2 * time * 440);\n});\nsrc.pipe(writable);\n\n\n//or simply send data to web-audio\nvar chunk = new Float32Array(1024);\nfor (var i = 0; i < 1024; i++) {\n\tchunk[i] = Math.random();\n}\nwritable.write(chunk);\n\nsetTimeout(writable.end, 1000);\n```\n\nStream is smart enough to recognize any type of data placed into it: audioBuffer, arrayBuffer, float32Array, buffer, array. Make sure only that passed buffer format complies with passed options.\n\n</details>\n\n<details><summary>**`let readable = Readable(audioNode, options?)`**</summary>\n\nCreate readable stream of web-audio data from _audioNode_, possibly with options.\n\n```js\nconst Readable = require('web-audio-stream/readable');\n\nlet readable = Readable(myNode);\nreadable.on('data', buffer => {\n\tconsole.log('Got audio buffer');\n});\n```\n\n</details>\n\n## In the wild\n\n* [wavearea](https://github.com/audio-lab/wavearea) â edit audio in textarea.\n\n\n## Related\n\n* [audio-speaker](https://github.com/audiojs/audio-speaker) â node/browser speaker stream.\n* [audio-through](https://github.com/audiojs/audio-speaker) â universal audio stream class.\n"},{"name":"audiojs/audio-buffer-utils","link":"https://github.com/audiojs/audio-buffer-utils","stars":3,"readme":"# audio-buffer-utils [![Build Status](https://travis-ci.org/audiojs/audio-buffer-utils.svg?branch=master)](https://travis-ci.org/audiojs/audio-buffer-utils) [![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)\n\nUtility functions for [_AudioBuffers_](https://github.com/audiojs/audio-buffer) in web-audio and node. Optimized for performance.\n\n## Usage\n\n[![npm install audio-buffer-utils](https://nodei.co/npm/audio-buffer-utils.png?mini=true)](https://npmjs.org/package/audio-buffer-utils/)\n\n### `const util = require('audio-buffer-utils')`\nGet utils toolset.\n\n_AudioBuffer_ data layout is considered horizontal, in that samples are arranged horizontally and channels vertically. Functions arguments take sample index first and channel index second.\n\nSample values range from `-1` to `1`, but not limited to it.\n\n### `util.create(data|length, channels = 2, sampleRate = 44100)`\nCreate a new buffer from any argument.\nData can be a length, an array with channels' data, an other buffer or plain array.\n\n```js\n//mono buffer with 100 samples\nlet a = util.create(100, 1)\n\n//stereo buffer with predefined channels data\nlet b = util.create([Array(100).fill(0.5), Array(100).fill(0.4)])\n\n//minimal length buffer (1 sample, 2 channels)\nlet c = util.create()\n\n//create 2 seconds buffer with reduced sample rate\nlet rate = 22050\nlet d = util.create(2 * rate, 2, rate)\n```\n\n### `util.shallow(buffer)`\nCreate a new buffer with the same characteristics as `buffer`, contents are undefined.\n\n```js\n//create buffer with the same shape as `a`\nlet b = util.shallow(a)\n\nutil.equal(a, b) //false\n```\n\n### `util.clone(buffer)`\nCreate a new buffer with the same characteristics as `buffer`, fill it with a copy of `buffer`'s data, and return it.\n\n```js\n//clone buffer `a`\nlet b = util.clone(a)\n\nutil.equal(a, b) //true\n```\n\n### `util.copy(fromBuffer, toBuffer, offset = 0)`\nCopy the data from one buffer to another, with optional offset.\n\n### `util.reverse(buffer, target?)`\nReverse `buffer`. Place data to `target` buffer, if any, otherwise modify `buffer` in-place.\n\n### `util.invert(buffer, target?)`\nInvert `buffer`. Place data to `target` buffer, if any, otherwise modify `buffer` in-place.\n\n### `util.zero(buffer)`\nZero all of `buffer`'s channel data. `buffer` is modified in-place.\n\n### `util.noise(buffer)`\nFill `buffer` with random data. `buffer` is modified in-place.\n\n### `util.equal(bufferA, bufferB, ...)`\nTest whether the content of N buffers is the same.\n\n```js\nlet a = util.create(1024, 2)\nutil.noise(a)\nlet b = util.clone(a)\nlet c = util.shallow(a)\nutil.copy(a, c)\n\nif (util.equal(a, b, c)) {\n\t//true\n}\n```\n\n### `util.fill(buffer, target?, value|(value, i, channel) => value, start = 0, end = -0)`\nFill `buffer` with provided function or value.\nPlace data to `target` buffer, if any, otherwise modify `buffer` in-place.\nPass optional `start` and `end` indexes.\n\n```js\nlet frequency = 440, rate = 44100\n\n//create 2 seconds buffer\nlet a = util.create(2 * rate)\n\n//populate with 440hz sine wave\nutil.fill(a, (value, i, channel) => Math.sin(Math.PI * 2 * frequency * i / rate))\n```\n\n### `util.map(buffer, (value, i, channel) => newValue )`\nCreate a new buffer by mapping the samples of the current one.\n\n```js\n//append second harmonic to buffer `a`\nlet b = util.map(a, (value, i, channel) => value + Math.sin(Math.PI * 2 * (frequency * 2) * i / rate))\n```\n\n### `util.slice(buffer, start = 0, end = -0)`\nCreate a new buffer by slicing the current one.\n\n### `util.concat(buffer1, buffer2, buffer3, ...)`\nCreate a new buffer by concatting passed buffers.\nChannels are extended to the buffer with maximum number.\nSample rate is changed to the maximum within the buffers.\n\n### `util.resize(buffer, length)`\nReturn new buffer based on the passed one, with shortened/extended length.\nInitial data is whether sliced or filled with zeros. Combines `util.pad` and `util.slice`.\n\n```js\n//change duration to 2s\nlet b = util.resize(a, 2 * a.sampleRate)\n```\n\n### `util.pad(buffer|length, length|buffer, value = 0)`\n### `util.padLeft(buffer, length, value = 0)`\n### `util.padRight(buffer, length, value = 0)`\nRight/left-pad buffer to the length, filling with value.\n\n```js\nlet buf = util.create(3, 1)\nutil.fill(buf, .2)\n\nutil.pad(buf, 5) // [.2,.2,.2, 0,0]\nutil.pad(5, buf) // [0,0, .2,.2,.2]\nutil.pad(buf, 5, .1) // [.2,.2,.2, .1,.1]\nutil.pad(5, buf, .1) // [.1,.1, .2,.2,.2]\n```\n\n### `util.shift(buffer, offset)`\nShift signal in the time domain by `offset` samples, filling with zeros.\nModify `buffer` in-place.\n\n### `util.rotate(buffer, offset)`\nShift signal in the time domain by `offset` samples, in circular fashion.\nModify `buffer` in-place.\n\n### `util.normalize(buffer, target?, start = 0, end = -0)`\nNormalize buffer by the amplitude, bring to -1..+1 range. Channel amplitudes ratio will be preserved. You may want to remove static level beforehead, because normalization preserves zero static level. Note that it is not the same as [array-normalize](https://github.com/dfcreative/array-noramalize).\nPlaces data to `target` buffer, if any, otherwise modifies `buffer` in-place.\n\n```js\nconst AudioBuffer = require('audio-buffer')\nconst util = require('audio-buffer-utils')\n\nlet buf = AudioBuffer(1, [0, 0.2, 0, -0.4]);\nutil.normalize(buf);\nbuf.getChannelData(0) // [0, .5, 0, -1]\n```\n\n### `util.removeStatic(buffer, target?, start = 0, end = -0)`\nRemove DC (Direct Current) offset from the signal, i.e. remove static level, that is bring mean to zero. DC offset will be reduced for every channel independently.\n\n```js\nvar a = AudioBuffer(2, [.5,.7,.3,.5])\n\nutil.removeStatic(a)\n\na.getChannelData(0) // [-.1, .1]\na.getChannelData(1) // [-.1, .1]\n```\n\n### `util.trim(buffer, threshold = 0)`\n### `util.trimLeft(buffer, threshold = 0)`\n### `util.trimRight(buffer, threshold = 0)`\nCreate buffer with trimmed zeros from the start and/or end, by the threshold amplitude.\n\n### `util.mix(bufferA, bufferB, ratio|(valA, valB, i, channel) => val?, offset = 0)`\nMix second buffer into the first one. Pass optional weight value or mixing function.\n\n### `util.size(buffer)`\nReturn buffer size, in bytes. Use [pretty-bytes](https://npmjs.org/package/pretty-bytes) package to format bytes to a string, if needed.\n\n### `util.data(buffer, data?)`\nGet channels' data in array. Pass existing array to transfer the data to it.\nUseful in audio-workers to transfer buffer to output.\n\n```js\nlet a = util.create(3, 2)\n\nlet audioData = util.data(a) // [[0,0,0], [0,0,0]]\n```\n\n## Related\n\n> [audio-buffer](https://github.com/audio-lab/buffer) â audio data container, both for node/browser.<br/>\n\n## Credits\n\nThanks to [**@jaz303**](https://github.com/jaz303/) for [the initial idea](https://github.com/jaz303/audio-buffer-utils) and collaboration.\n"},{"name":"audiojs/pcm-util","link":"https://github.com/audiojs/pcm-util","stars":6,"readme":"# pcm-util [![Build Status](https://travis-ci.org/audiojs/pcm-util.svg?branch=master)](https://travis-ci.org/audiojs/pcm-util) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nUtils to tamper with PCM formats/buffers.\n\n\n[![npm install pcm-util](https://nodei.co/npm/pcm-util.png?mini=true)](https://npmjs.org/package/pcm-util/)\n\n\n```js\nvar pcm = require('pcm-util');\n\n\n/** Default PCM format to use for any operations */\npcm.defaults === {\n\tchannels: 2,\n\tsampleRate: 44100,\n\tinterleaved: true,\n\tfloat: false,\n\tsigned: true,\n\tbitDepth: 16,\n\tbyteOrder: 'LE',\n\tmax: 32767,\n\tmin: -32768,\n\tsampleSize: 4,\n\tsamplesPerFrame: 1024,\n\tid: 'S_16_LE_2_44100_I'\n};\n\n\n/**\n * Normalize passed format:\n * ensure all the properties are present and do not contradict.\n */\npcm.normalize(format);\n\n\n/** Retrieve format-related properties from any object, return not normalized format */\npcm.format(audioBuffer);\n\n\n/** Compare whether two formats are equal to each other */\npcm.equal(a, b);\n\n\n/** Convert buffer of the `format` to audio buffer */\npcm.toAudioBuffer(buffer, format);\n\n\n/** Convert audio buffer to buffer of the `format` */\npcm.toBuffer(audioBuffer, format);\n\n\n/**\n * Convert buffer from one format to another.\n */\npcm.convert(buffer, fromFormat, toFormat);\n```\n\n\n### Related\n\n> [audio-buffer](https://npmjs.org/package/audio-buffer) â high-level audio data container.<br/>\n> [audio-buffer-utils](https://npmjs.org/package/audio-buffer-utils) â utils for audio buffers.<br/>\n> [audio-pcm-format](https://npmjs.org/package/audio-pcm-format) â pcm format converter stream.<br/>\n> [audio-node](https://npmjs.org/package/audio-node) â stream-based AudioNode implementation for node/browser.\n"},{"name":"audiojs/a-weighting","link":"https://github.com/audiojs/a-weighting","stars":12,"readme":"# a-weighting [![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)\n\nPerform A-weighting (and others) for a frequency.\nUseful for creating believable spectrum images and audio measurements.\n\n<img alt=\"A-weighting\" src=\"https://upload.wikimedia.org/wikipedia/commons/3/39/Acoustic_weighting_curves_%281%29.svg\" width=\"400\"/>\n\n## Usage\n\n[![npm install a-weighting](https://nodei.co/npm/a-weighting.png?mini=true)](https://npmjs.org/package/a-weighting/)\n\n```js\nvar aWeight = require('a-weighting/a');\nvar ft = require('fourier-transform');\n\n//get a-weighted frequencies\nvar frequencies = ft(waveform).map(function (magnitude, i, data) {\n\tvar frequency = 22050 * i / data;\n\n\treturn aWeight(frequency) * magnitude;\n});\n```\n\nNote that weight function returns normalized `0..1` weight values, it does not do decibels calculation. If you need to convert weight to decibels, do `20 * Math.log(weight) / Math.log(10)`.\n\nImplemented weights:\n\n* [A-weighting](https://en.wikipedia.org/wiki/A-weighting)\n* B-weighting\n* C-weighting\n* D-weighting\n* Z-weighting (zero weighting)\n* [ITU-R 468 weighting](https://en.wikipedia.org/wiki/ITU-R_468_noise_weighting)\n\n## Credits\n\nThanks to all the specialists who researched and described these curves (years of work I guess) and wikipedia for detailed articles on this.\n\n## Related\n\n* [fourier-transform](https://github.com/scijs/fourier-transform) â fft fast implementation.\n* [gl-spectrum](https://github.com/audio-lab/gl-spectrum) â spectrum rendering component.\n* [Equal-loudness-contours](https://en.wikipedia.org/wiki/Equal-loudness_contour)."},{"name":"audiojs/decibels","link":"https://github.com/audiojs/decibels","stars":7,"readme":"decibels\n===\n\nConvert values to and from decibels.\n\n## Install [via npm](https://www.npmjs.com/package/decibels)\n\n```js\n$ npm install decibels\n```\n\n## API\n\n```js\nvar gainToDecibels = require('decibels/from-gain')\nvar decibelsToGain = require('decibels/to-gain')\n```\n\n### `gainToDecibels(gain)`\n\n### `decibelsToGain(db)`\n\n## License\n\nMIT"},{"name":"audiojs/is-audio-buffer","link":"https://github.com/audiojs/is-audio-buffer","stars":3,"readme":"# is-audio-buffer [![Build Status](https://travis-ci.org/audiojs/is-audio-buffer.svg?branch=master)](https://travis-ci.org/audiojs/is-audio-buffer) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nCheck whether an object is instance of [AudioBuffer](http://webaudio.github.io/web-audio-api/#AudioBuffer).\n\n## Usage\n\n[![npm install is-audio-buffer](https://nodei.co/npm/is-audio-buffer.png?mini=true)](https://npmjs.org/package/is-audio-buffer/)\n\n```js\nvar isAudioBuffer = require('is-audio-buffer');\nvar ctx = require('audio-context');\nvar AudioBuffer = require('audio-buffer');\n\n\nisAudioBuffer(ctx.createBuffer(2, 100, 44100)); //true\nisAudioBuffer(new AudioBuffer([1, 0, 1, 0])); //true\nisAudioBuffer(new Float32Array([1, 2, 3])); //false\nisAudioBuffer(); //false\n```\n\nBecause there is too many implementations of AudioBuffer ([1](https://www.npmjs.com/package/audiobuffer), [2](https://www.npmjs.com/package/audio-buffer), [3](https://github.com/sebpiq/node-web-audio-api/blob/master/lib/AudioBuffer.js), [4](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer)) to rely on `a instanceof AudioBuffer`.\n"}]
},{}]},{},[6]);
