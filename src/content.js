/**
 * @file Chrome Extension for Github to collapse block comments from source
 * viewer.
 * @author James Kyle <me@thejameskyle.com>
 * @license ISC
 */

/**
 * Regex for testing if a line of code is the start of a block comment.
 * @constant COMMENT_START
 * @type {RegExp}
 */
const COMMENT_START = /(^([ \t]+)?\/\*|^([ \t]+)?###)/gi;

/**
 * Regex for testing if a line of code is the end of a block comment
 * @constant COMMENT_END
 * @type {RegExp}
 */
const COMMENT_END = /(\*\/|^([ \t]+)?###)/gi;

/**
 * Regex for stripping comment syntax from coment line.
 */
const COMMENT_SYNTAX = /(^[ \t]+\/\* ?|^[ \t]+#(##)? ?| ?\*\/|^[ \t]+|[ \t]+$)/gi;

/**
 * @public
 * @class Line
 */
class Line {

  /**
   * @public
   * @constructs Line
   * @param {Node} node A single line in a file.
   * @param {Number} index The index of the line in the file.
   */
  constructor(node, index) {
    this.node = node;
    this.index = index;
    this.text = node.textContent;
    this.parentNode = node.parentNode;
  }

  /**
   * Render line (adds comment style).
   * @public
   * @instance
   * @method render
   */
  render() {
    this.parentNode.classList.add('blob-expanded');
  }

  /**
   * Show line.
   * @public
   * @instance
   * @method show
   */
  show() {
    this.parentNode.style.display = '';
  }

  /**
   * Hide line.
   * @public
   * @instance
   * @method hide
   */
  hide() {
    this.parentNode.style.display = 'none';
  }

  /**
   * Cleanup and destroy line.
   * @public
   * @instance
   * @method destroy
   */
  destroy() {
    delete this.node;
    delete this.index;
    delete this.text;
    delete this.parentNode;
  }
}

/**
 * A toggle line to collapse and expand comments.
 * @public
 * @class Toggle
 */
class Toggle {

  /**
   * @public
   * @instance
   * @method constructor
   * @param {Comment} comment - The comment to toggle.
   */
  constructor(comment) {
    this.comment = comment;
    this.render();
    this.insert();
    this.bind();
  }

  /**
   * Renders the toggle and collapsed line.
   * @public
   * @instance
   * @method render
   */
  render() {
    var prev = this.comment.lines[0].parentNode.previousSibling;
    
    if (prev.dataset && prev.dataset.position) {
      this.el = prev;
      return;
    }

    this.el = document.createElement('tr');
    this.el.className = 'js-expandable-line';
    this.el.dataset.position = this.comment.start.index;

    var preview = `@@ ${this.comment.start.index + 1}-${this.comment.end.index + 1} @@ `;

    if (this.comment.lines[1]) {
      preview += `${this.comment.lines[1].text.replace(COMMENT_SYNTAX, '')}`;
    } else {
      preview += `${this.comment.lines[0].text.replace(COMMENT_SYNTAX, '')}`;
    }

    this.el.innerHTML = `
      <td class="blob-num blob-num-expandable">
        <a class="diff-expander js-expand" title="Expand" aria-label="Expand">
          <span class="octicon octicon-unfold"></span>
        </a>
      </td>
      <td class="blob-code blob-code-hunk">${preview}</td>
    `;
    this.hide();
  }

  /**
   * Inserts the toggle into the dom.
   * @public
   * @instance
   * @method insert
   */
  insert() {
    if (document.contains(this.el)) {
      return;
    }
    var firstParent = this.comment.start.parentNode;
    firstParent.parentNode.insertBefore(this.el, firstParent);
  }

  /**
   * Adds event listeners to the toggle.
   * @public
   * @instance
   * @method bind
   */
  bind() {
    this.unbind();

    this._listener = function() {
      this.comment.show();
      this.hide();
    }.bind(this);

    this.el.addEventListener('click', this._listener);
  }

  /**
   * Removes event listeners from the toggle.
   * @public
   * @instance
   * @method unbind
   */
  unbind() {
    if (!this._listener) {
      return;
    }
    this.el.removeEventListener('click', this._listener);
    delete this._listener;
  }

  /**
   * Show the comment.
   * @public
   * @instance
   * @method hide
   */
  show() {
    this.el.style.display = '';
  }

  /**
   * Hide the comment.
   * @public
   * @instance
   * @method hide
   */
  hide() {
    this.el.style.display = 'none';
  }

  /**
   * Cleanup and destroy toggle.
   * @public
   * @instance
   * @method destroy
   */
  destroy() {
    this.unbind();
    this.el.remove();
    delete this.comment;
    delete this.el;
  }
}

/**
 * @public
 * @class Comment
 */
class Comment {

  /**
   * @public
   * @instance
   * @method constructor
   * @param {Line[]} lines - The lines of the comment.
   */
  constructor(lines) {
    this.lines = lines;
    this.length = this.lines.length;
    this.start = this.lines[0];
    this.end = this.lines[this.length - 1];
  }

  /**
   * Render the comment (creating a toggle).
   * @public
   * @instance
   * @method render
   */
  render() {
    this.lines.forEach(line => line.render());
    this.toggle = new Toggle(this);
  }

  /**
   * Show the comment.
   * @public
   * @instance
   * @method show
   */
  show() {
    this.lines.forEach(line => line.show());
    this.toggle.hide();
  }

  /**
   * Hide the comment.
   * @public
   * @instance
   * @method hide
   */
  hide() {
    this.lines.forEach(line => line.hide());
    this.toggle.show();
  }

  /**
   * Cleanup and destroy comment.
   * @public
   * @instance
   * @method destroy
   */
  destroy() {
    this.toggle.destroy();
    delete this.lines;
    delete this.start;
    delete this.end;
    delete this.toggle;
  }
}

/**
 * @public
 * @class File
 */
class File {

  /**
   * @public
   * @instance
   * @method constructor
   */
  constructor() {
    this.nodes = document.getElementsByClassName('blob-code');
    this.lines = [];
    this.comments = [];
    this.parse();
    this.render();
  }

  /**
   * Break down lines of a file into comments.
   * @public
   * @instance
   * @method parse
   */
  parse() {
    var comment = false;
    var lines;

    for (var index = 0, length = this.nodes.length; index < length; index++) {
      var node = this.nodes[index];
      var line = new Line(node, index);

      this.lines.push(line);

      if (!comment && COMMENT_START.test(line.text)) {
        lines = [];
        comment = true;
      }

      if (comment) {
        lines.push(line);
      }

      if (comment && COMMENT_END.test(line.text)) {
        this.comments.push(new Comment(lines));
        comment = false;
      }
    }
  }

  /**
   * Render the files comments.
   * @public
   * @instance
   * @method show
   */
  render() {
    this.comments.forEach(comment => comment.render());
  }

  /**
   * Show file comments.
   * @public
   * @instance
   * @method hide
   */
  show() {
    this.comments.forEach(comment => comment.show());
  }

  /**
   * Hide file comments.
   * @public
   * @instance
   * @method hide
   */
  hide() {
    var lineNum = +location.hash.replace('#L', '');

    this.comments.forEach(comment => {
      if (lineNum <= comment.start.index || lineNum >= comment.end.index) {
        comment.hide();
      }
    });
  }

  /**
   * Cleanup and destroy file.
   * @public
   * @instance
   * @method destroy
   */
  destroy() {
    this.comments.forEach(comment => comment.destroy());
    this.lines.forEach(line => line.destroy());
    delete this.nodes;
    delete this.lines;
    delete this.comments;
  }
}

/**
 * Toggle button for hiding and showing all comments in files.
 * @public
 * @class FileToggle
 */
class FileToggle {

  /**
   * @public
   * @instance
   * @method constructor
   * @param {File} file - The current file to toggle.
   * @param {Boolean} isHidden - The current hidden state of the extension.
   */
  constructor(file, isHidden) {
    this.file = file;
    this.isHidden = isHidden;
    this.container = document.querySelector('.file-navigation .breadcrumb');

    if (!this.container || document.getElementsByClassName('toggle-comment-btn').length) {
      return;
    }

    this.render();
    this.insert();
    this.bind();
  }

  /**
   * Renders the toggle button.
   * @public
   * @instance
   * @method render
   */
  render() {
    this.el = document.createElement('a');
    this.el.className = 'toggle-comment-btn minibutton right';
    this.el.style.marginRight = '8px';
    this.el.textContent = 'Toggle Comments';
  }

  /**
   * Inserts the toggle button into the dom.
   * @public
   * @instance
   * @method insert
   */
  insert() {
    this.container.parentNode.insertBefore(this.el, this.container.nextSibling);
  }

  /**
   * Adds event listeners to the toggle button.
   * @public
   * @instance
   * @method bind
   */
  bind() {
    this.unbind();
    this._listener = this.toggle.bind(this);
    this.el.addEventListener('click', this._listener);
  }

  /**
   * Removes event listeners from the toggle button.
   * @public
   * @instance
   * @method unbind
   */
  unbind() {
    if (!this._listener) {
      return;
    }
    this.el.removeEventListener('click', this._listener);
    delete this._listener;
  }

  /**
   * Toggle file comments.
   * @public
   * @instance
   * @method toggle
   */
  toggle() {
    if (this.isHidden) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Show file comments.
   * @public
   * @instance
   * @method show
   */
  show() {
    this.isHidden = false;
    this.file.show();
  }

  /**
   * Hide file comments.
   * @public
   * @instance
   * @method hide
   */
  hide() {
    this.isHidden = true;
    this.file.hide();
  }

  /**
   * Cleanup and destroy toggle.
   * @public
   * @instance
   * @method destroy
   */
  destroy() {
    this.unbind();
    delete this.el;
  }
}

/**
 * Creates and manages extension.
 * @public
 * @class Extension
 */
class Extension {

  /**
   * @public
   * @instance
   * @method constructor
   */
  constructor() {
    this.isHidden = true;
    this.container = document.getElementById('js-repo-pjax-container');
    this.render();
    this.observe();
  }

  /**
   * Creates a MutationObserver that watches for the file viewer to be swapped
   * out.
   * @public
   * @instance
   * @method observe
   */
  observe() {
    this.observer = new MutationObserver(() => {
      this.isHidden = this.toggle.isHidden;
      this.destroy();
      this.render();
    });
    this.observer.observe(this.container, {
      childList: true
    });
  }

  /**
   * Renders the extension
   * @public
   * @instance
   * @method render
   */
  render() {
    this.file = new File();
    this.toggle = new FileToggle(this.file, this.isHidden);

    if (this.isHidden) {
      this.file.hide();
    }
  }

  /**
   * Cleanup and destroy extension.
   * @public
   * @instance
   * @method destroy
   */
  destroy() {
    this.file.destroy();
    this.toggle.destroy();
    delete this.file;
    delete this.toggle;
  }
}

/**
 * Kick off extension.
 * @type {Extension}
 */

(() => new Extension())();
