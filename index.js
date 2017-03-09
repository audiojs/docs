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
};
},{"hyperapp":9,"marked":2}],5:[function(require,module,exports){
var _require = require('hyperapp'),
    h = _require.h;

module.exports = function (state, actions) {
  return h('div', { class: 'sidebar' }, state.projects.map(function (project) {
    return h('div', { class: 'project' }, [h('a', { class: 'project-name', href: '#' + project.name }, project.name)]);
  }));
};
},{"hyperapp":9}],6:[function(require,module,exports){
var _require = require('hyperapp'),
    app = _require.app,
    Router = _require.Router;

var main = require('./view/main');
var repo = require('./view/repo');
var css = 0;
var projects = require('projects');(require('sheetify/insert')("html, body, #main, .app {\n  margin: 0;\n  padding: 0;\n  font-family: 'PT Sans';\n  width: 100%;\n  height: 100%;\n}\n\n.app {\n  display: flex;\n}\n\n.sidebar, .readme {\n  height: 100%;\n  overflow: auto;\n}\n\n.readme {\n  width: 100%;\n}\n\n.sidebar {\n  min-width: 300px;\n}") || true) && "_b182b685";

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
});
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
module.exports=[{"name":"audiojs/audio","link":"https://github.com/audiojs/audio","stars":37,"readme":"# Audio [![build status][travis-i]][travis] [![gitter][gitter-i]][gitter]\n> Framework for handling audio in JavaScript.\n\n```javascript\n// Use streams to create, manipulate, or serialize audio.\n// For example, decoding and encoding with audio-wav:\nfs.createReadStream('./foo.wav').pipe(wav.decode())\n\n// Create your own streams to use the PCM data directly.\n.pipe(through2.obj(function(audio, enc, callback) {\n  // Read pulse values\n  var left = audio.read(200, 1);\n  var right = audio.read(100, 2);\n\n  // Write pulse values\n  audio.write(7, 500, 2);\n\n  // Push audio to continue pipe chain.\n  callback(null, audio);\n}));\n```\n\nA framework and object for using audio in JavaScript.  Based on top of streams to allow chaining utilities that wrap more complex operations.\n\n## Documentation\nSee [the `docs/` folder](docs/) for info on the framework and object.  Use [StackOverflow][stackoverflow] for your questions.\n\n## Installation\nUse the [npm keyword \"audiojs\"][npm-audiojs] to find utilities (with directions in their own READMEs).\n\nIf you are creating a utility and need to use the `Audio` object:\n```shell\n$ npm install --save audio\n```\n(Use `audio@next` for latest prerelease versions)\n\n## Credits\n\n|  ![jamen][author-avatar]  |\n|:-------------------------:|\n| [Jamen Marz][author-site] |\n\n## License\n[MIT](LICENSE) &copy; Jamen Marz\n\n\n[travis]: https://travis-ci.org/audiojs/audio\n[travis-i]: https://travis-ci.org/audiojs/audio.svg\n[gitter]: https://gitter.im/audiojs/audio\n[gitter-i]: https://badges.gitter.im/Join%20Chat.svg\n[npm-audiojs]: https://www.npmjs.com/browse/keyword/audiojs\n[author-site]: https://github.com/jamen\n[author-avatar]: https://avatars.githubusercontent.com/u/6251703?v=3&s=125\n[stackoverflow]: http://stackoverflow.com/questions/ask\n"},{"name":"audiojs/audio-buffer","link":"https://github.com/audiojs/audio-buffer","stars":14,"readme":"# audio-buffer [![Build Status](https://travis-ci.org/audiojs/audio-buffer.svg?branch=master)](https://travis-ci.org/audiojs/audio-buffer) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\n[AudioBuffer](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) ponyfill. Provides useful constructor for Web-Audio API _AudioBuffer_, if available, otherwise provides optimal _AudioBuffer_ implementation for node/browsers. Useful instead of _Buffer_ in audio streams (see [**@audiojs**](https://github.com/audiojs) components).\n\n## Usage\n\n[![npm install audio-buffer](https://nodei.co/npm/audio-buffer.png?mini=true)](https://npmjs.org/package/audio-buffer/)\n\n```js\nvar AudioBuffer = require('audio-buffer')\n\n//Create audio buffer from a data source or of a length.\n//Data is interpreted as a planar sequence of float32 samples.\n//It can be Array, TypedArray, ArrayBuffer, Buffer, AudioBuffer, DataView, NDArray etc.\nvar buffer = new AudioBuffer(channels = 2, data|length, sampleRate = 44100)\n\n//Duration of the underlying audio data, in seconds\nbuffer.duration\n\n//Number of samples per channel\nbuffer.length\n\n//Default sample rate is 44100\nbuffer.sampleRate\n\n//Default number of channels is 2\nbuffer.numberOfChannels\n\n//Get array containing the data for the channel (not copied)\nbuffer.getChannelData(channel)\n\n//Place data from channel to destination Float32Array\nbuffer.copyFromChannel(destination, channelNumber, startInChannel = 0)\n\n//Place data from source Float32Array to the channel\nbuffer.copyToChannel(source, channelNumber, startInChannel = 0)\n\n\n//Some special properties, itâs unlikely you will ever need them.\n\n//Type of array for data. Float64Array is faster for modern node/browsers.\nAudioBuffer.FloatArray = Float64Array\n\n//In browser, you can set custom audio context (online/offline).\nAudioBuffer.context = require('audio-context')\n\n//Whether WebAudioAPI AudioBuffer should be created, if avail, instead of polyfilled structure\nAudioBuffer.isWAA = true\n```\n\n## See also\n\n* [audio-buffer-utils](https://github.com/audiojs/audio-buffer-utils) â utils for audio buffers\n* [pcm-util](https://npmjs.org/package/pcm-util) â utils for audio format convertions.\n\n## Similar\n\n* [ndsamples](https://github.com/livejs/ndsamples) â audio-wrapper for ndarrays. A somewhat alternative approach to wrap audio data, based on ndarrays, used by some modules in [livejs](https://github.com/livejs).\n* [1](https://www.npmjs.com/package/audiobuffer), [2](https://www.npmjs.com/package/audio-buffer), [3](https://github.com/sebpiq/node-web-audio-api/blob/master/lib/AudioBuffer.js), [4](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) â other AudioBuffer implementations.\n* [audiodata](https://www.npmjs.com/package/audiodata) alternative data holder from @mohayonao.\n"},{"name":"audiojs/audio-oscillator","link":"https://github.com/audiojs/audio-oscillator","stars":6,"readme":"# audio-oscillator [![Build Status](https://travis-ci.org/audiojs/audio-oscillator.svg?branch=master)](https://travis-ci.org/audiojs/audio-oscillator) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nOscillate some periodic wave into stream. [OscillatorNode](http://webaudio.github.io/web-audio-api/#the-oscillatornode-interface) in stream land.\n\n## Usage\n\n[![$ npm install audio-oscillator](http://nodei.co/npm/audio-oscillator.png?mini=true)](http://npmjs.org/package/audio-oscillator)\n\n```js\nvar Oscillator = require('audio-oscillator');\nvar Speaker = require('audio-speaker');\nvar Slice = require('audio-slice');\n\nOscillator({\n\t//in hz\n\tfrequency: 440,\n\n\t//in cents\n\tdetune: 0,\n\n\t//sine, triangle, square, saw, pulse, wave\n\ttype: 'sine',\n\n\t//normalize result of `wave` type\n\tnormalize: true\n})\n.pipe(Slice(1))\n.pipe(Speaker());\n\n\n//Set periodic wave from arrays of real and imaginary coefficients\noscillator.setPeriodicWave(real, imag);\n```\n\n## Related\n\n> [audio-generator](https://github.com/audiojs/audio-generator) â generate audio stream with a function.<br/>\n> [audio-speaker](https://github.com/audiojs/audio-speaker) â output audio stream to speaker in node/browser.<br/>\n> [web-audio-stream](https://github.com/audiojs/web-audio-stream) â stream to web-audio node.<br/>\n"},{"name":"audiojs/audio-speaker","link":"https://github.com/audiojs/audio-speaker","stars":33,"readme":"#audio-speaker [![Build Status](https://travis-ci.org/audiojs/audio-speaker.svg?branch=master)](https://travis-ci.org/audiojs/audio-speaker) [![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)\n\nOutput audio stream to speaker in node or browser.\n\n[![npm install audio-speaker](https://nodei.co/npm/audio-speaker.png?mini=true)](https://npmjs.org/package/audio-speaker/)\n\n\n### Use as a stream\n\n```js\nvar Speaker = require('audio-speaker/stream');\nvar Generator = require('audio-generator/stream');\n\nGenerator(function (time) {\n\t//panned unisson effect\n\tvar Ï = Math.PI * 2;\n\treturn [Math.sin(Ï * time * 441), Math.sin(Ï * time * 439)];\n})\n.pipe(Speaker({\n\t//PCM input format defaults, optional.\n\t//channels: 2,\n\t//sampleRate: 44100,\n\t//byteOrder: 'LE',\n\t//bitDepth: 16,\n\t//signed: true,\n\t//float: false,\n\t//interleaved: true,\n}));\n```\n\n### Use as a pull-stream\n\n```js\nconst pull = require('pull-stream/pull');\nconst speaker = require('audio-speaker/pull');\nconst osc = require('audio-oscillator/pull');\n\npull(osc({frequency: 440}), speaker());\n```\n\n### Use directly\n\nSpeaker is [async-sink](https://github.com/audiojs/contributing/wiki/Streams-convention) with `fn(data, cb)` notation.\n\n```js\nconst createSpeaker = require('audio-speaker');\nconst createGenerator = require('audio-generator');\n\nlet output = createSpeaker();\nlet generate = createGenerator(t => Math.sin(t * Math.PI * 2 * 440));\n\n(function loop (err, buf) {\n\tlet buffer = generate();\n\toutput(buffer, loop);\n})();\n```\n\n#### Related\n\n> [web-audio-stream](https://github.com/audiojs/web-audio-stream) â stream data to web-audio.<br/>\n> [audio-through](http://npmjs.org/package/audio-through) â universal stream for processing audio.<br/>\n> [node-speaker](http://npmjs.org/package/speaker) â output pcm stream to speaker in node.<br/>\n> [audio-feeder](https://github.com/brion/audio-feeder) â cross-browser speaker for pcm data.<br/>\n"}]
},{}]},{},[6]);
