'use strict';

function run() {
  var nodes = document.getElementsByClassName('blob-code');

  var COMMENT_START = /\/\*/;
  var COMMENT_END = /\*\//;

  var comment = false;

  for (var i = 0, l = nodes.length; i < l; i++) {
    var node = nodes[i];
    var text = node.textContent;

    if (!comment && COMMENT_START.test(text)) {
      comment = [];
    }

    if (comment) {
      comment.push({ index: i, node: node, text: text });
    }

    if (comment && COMMENT_END.test(text)) {
      collapseComment(comment);
      comment = false;
    }
  }
}

function collapseComment(comment) {
  var start = comment[0];
  var end = comment[comment.length - 1];

  if (+location.hash.replace('#L', '') > start.index && hashLine < end.index) {
    comment.forEach(showLine);
    return;
  }

  var toggle = createToggle(comment);

  var insertNode = start.node.parentNode
  insertNode.parentNode.insertBefore(toggle, insertNode);

  comment.forEach(hideLine);

  toggle.addEventListener('click', function() {
    toggle.style.display = 'none';
    comment.forEach(showLine);
  });
}

function createToggle(comment) {
  var start = comment[0];
  var first = comment[1];
  var end   = comment[comment.length - 1]

  var toggle = document.createElement('tr');
  toggle.className = 'js-expandable-line';
  toggle.dataset.position = start.index;

  var preview = start.index + '-' + end.index + ' @@ ' + first.text.replace(/.*\* /, '');
  toggle.innerHTML = '<td class="blob-num blob-num-expandable"> \
      <a class="diff-expander js-expand" title="Expand" aria-label="Expand"> \
        <span class="octicon octicon-unfold"></span> \
      </a> \
    </td> \
    <td class="blob-code blob-code-hunk">@@ ' + preview + '</td>';
  return toggle;
}

function hideLine(line) {
  line.node.parentNode.style.display = 'none';
}

function showLine(line) {
  line.node.parentNode.classList.add('blob-expanded');
  line.node.parentNode.style.display = '';
}

run();

var container = document.getElementById('js-repo-pjax-container');
var observer = new MutationObserver(run)

observer.observe(container, {
  childList: true
});
