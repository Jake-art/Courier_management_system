

(function(mod) {
  if (typeof exports == "object" && typeof module == "object")
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd)
    define(["../../lib/codemirror"], mod);
  else
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

function lineIndent(cm, lineNo) {
  var text = cm.getLine(lineNo)
  var spaceTo = text.search(/\S/)
  if (spaceTo == -1 || /\bcomment\b/.test(cm.getTokenTypeAt(CodeMirror.Pos(lineNo, spaceTo + 1))))
    return -1
  return CodeMirror.countColumn(text, null, cm.getOption("tabSize"))
}

CodeMirror.registerHelper("fold", "indent", function(cm, start) {
  var myIndent = lineIndent(cm, start.line)
  if (myIndent < 0) return
  var lastLineInFold = null
  for (var i = start.line + 1, end = cm.lastLine(); i <= end; ++i) {
    var indent = lineIndent(cm, i)
    if (indent == -1) {
    } else if (indent > myIndent) {
      lastLineInFold = i;
    } else {
      break;
    }
  }
  if (lastLineInFold) return {
    from: CodeMirror.Pos(start.line, cm.getLine(start.line).length),
    to: CodeMirror.Pos(lastLineInFold, cm.getLine(lastLineInFold).length)
  };
});

});
