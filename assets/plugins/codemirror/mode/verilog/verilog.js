

(function(mod) {
  if (typeof exports == "object" && typeof module == "object")
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd)
    define(["../../lib/codemirror"], mod);
  else
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("verilog", function(config, parserConfig) {

  var indentUnit = config.indentUnit,
      statementIndentUnit = parserConfig.statementIndentUnit || indentUnit,
      dontAlignCalls = parserConfig.dontAlignCalls,
      noIndentKeywords = parserConfig.noIndentKeywords || [],
      multiLineStrings = parserConfig.multiLineStrings,
      hooks = parserConfig.hooks || {};

  function words(str) {
    var obj = {}, words = str.split(" ");
    for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
    return obj;
  }

  /**
   * Keywords from IEEE 1800-2012
   */
  var keywords = words(
    "accept_on alias always always_comb always_ff always_latch and assert assign assume automatic before begin bind " +
    "bins binsof bit break buf bufif0 bufif1 byte case casex casez cell chandle checker class clocking cmos config " +
    "const constraint context continue cover covergroup coverpoint cross deassign default defparam design disable " +
    "dist do edge else end endcase endchecker endclass endclocking endconfig endfunction endgenerate endgroup " +
    "endinterface endmodule endpackage endprimitive endprogram endproperty endspecify endsequence endtable endtask " +
    "enum event eventually expect export extends extern final first_match for force foreach forever fork forkjoin " +
    "function generate genvar global highz0 highz1 if iff ifnone ignore_bins illegal_bins implements implies import " +
    "incdir include initial inout input inside instance int integer interconnect interface intersect join join_any " +
    "join_none large let liblist library local localparam logic longint macromodule matches medium modport module " +
    "nand negedge nettype new nexttime nmos nor noshowcancelled not notif0 notif1 null or output package packed " +
    "parameter pmos posedge primitive priority program property protected pull0 pull1 pulldown pullup " +
    "pulsestyle_ondetect pulsestyle_onevent pure rand randc randcase randsequence rcmos real realtime ref reg " +
    "reject_on release repeat restrict return rnmos rpmos rtran rtranif0 rtranif1 s_always s_eventually s_nexttime " +
    "s_until s_until_with scalared sequence shortint shortreal showcancelled signed small soft solve specify " +
    "specparam static string strong strong0 strong1 struct super supply0 supply1 sync_accept_on sync_reject_on " +
    "table tagged task this throughout time timeprecision timeunit tran tranif0 tranif1 tri tri0 tri1 triand trior " +
    "trireg type typedef union unique unique0 unsigned until until_with untyped use uwire var vectored virtual void " +
    "wait wait_order wand weak weak0 weak1 while wildcard wire with within wor xnor xor");

  /** Operators from IEEE 1800-2012
     unary_operator ::=
       + | - | ! | ~ | & | ~& | | | ~| | ^ | ~^ | ^~
     binary_operator ::=
       + | - | * | / | % | == | != | === | !== | ==? | !=? | && | || | **
       | < | <= | > | >= | & | | | ^ | ^~ | ~^ | >> | << | >>> | <<<
       | -> | <->
     inc_or_dec_operator ::= ++ | --
     unary_module_path_operator ::=
       ! | ~ | & | ~& | | | ~| | ^ | ~^ | ^~
     binary_module_path_operator ::=
       == | != | && | || | & | | | ^ | ^~ | ~^
  */
  var isOperatorChar = /[\+\-\*\/!~&|^%=?:]/;
  var isBracketChar = /[\[\]{}()]/;

  var unsignedNumber = /\d[0-9_]*/;
  var decimalLiteral = /\d*\s*'s?d\s*\d[0-9_]*/i;
  var binaryLiteral = /\d*\s*'s?b\s*[xz01][xz01_]*/i;
  var octLiteral = /\d*\s*'s?o\s*[xz0-7][xz0-7_]*/i;
  var hexLiteral = /\d*\s*'s?h\s*[0-9a-fxz?][0-9a-fxz?_]*/i;
  var realLiteral = /(\d[\d_]*(\.\d[\d_]*)?E-?[\d_]+)|(\d[\d_]*\.\d[\d_]*)/i;

  var closingBracketOrWord = /^((\w+)|[)}\]])/;
  var closingBracket = /[)}\]]/;

  var curPunc;
  var curKeyword;
  var blockKeywords = words(
    "case checker class clocking config function generate interface module package " +
    "primitive program property specify sequence table task"
  );
  var openClose = {};
  for (var keyword in blockKeywords) {
    openClose[keyword] = "end" + keyword;
  }
  openClose["begin"] = "end";
  openClose["casex"] = "endcase";
  openClose["casez"] = "endcase";
  openClose["do"   ] = "while";
  openClose["fork" ] = "join;join_any;join_none";
  openClose["covergroup"] = "endgroup";

  for (var i in noIndentKeywords) {
    var keyword = noIndentKeywords[i];
    if (openClose[keyword]) {
      openClose[keyword] = undefined;
    }
  }
  var statementKeywords = words("always always_comb always_ff always_latch assert assign assume else export for foreach forever if import initial repeat while");

  function tokenBase(stream, state) {
    var ch = stream.peek(), style;
    if (hooks[ch] && (style = hooks[ch](stream, state)) != false) return style;
    if (hooks.tokenBase && (style = hooks.tokenBase(stream, state)) != false)
      return style;

    if (/[,;:\.]/.test(ch)) {
      curPunc = stream.next();
      return null;
    }
    if (isBracketChar.test(ch)) {
      curPunc = stream.next();
      return "bracket";
    }
    if (ch == '`') {
      stream.next();
      if (stream.eatWhile(/[\w\$_]/)) {
        return "def";
      } else {
        return null;
      }
    }
    if (ch == '$') {
      stream.next();
      if (stream.eatWhile(/[\w\$_]/)) {
        return "meta";
      } else {
        return null;
      }
    }
    if (ch == '#') {
      stream.next();
      stream.eatWhile(/[\d_.]/);
      return "def";
    }
    if (ch == '"') {
      stream.next();
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    if (ch == "/") {
      stream.next();
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      }
      if (stream.eat("/")) {
        stream.skipToEnd();
        return "comment";
      }
      stream.backUp(1);
    }
    if (stream.match(realLiteral) ||
        stream.match(decimalLiteral) ||
        stream.match(binaryLiteral) ||
        stream.match(octLiteral) ||
        stream.match(hexLiteral) ||
        stream.match(unsignedNumber) ||
        stream.match(realLiteral)) {
      return "number";
    }
    if (stream.eatWhile(isOperatorChar)) {
      return "meta";
    }
    if (stream.eatWhile(/[\w\$_]/)) {
      var cur = stream.current();
      if (keywords[cur]) {
        if (openClose[cur]) {
          curPunc = "newblock";
        }
        if (statementKeywords[cur]) {
          curPunc = "newstatement";
        }
        curKeyword = cur;
        return "keyword";
      }
      return "variable";
    }

    stream.next();
    return null;
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next, end = false;
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) {end = true; break;}
        escaped = !escaped && next == "\\";
      }
      if (end || !(escaped || multiLineStrings))
        state.tokenize = tokenBase;
      return "string";
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return "comment";
  }

  function Context(indented, column, type, align, prev) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.align = align;
    this.prev = prev;
  }
  function pushContext(state, col, type) {
    var indent = state.indented;
    var c = new Context(indent, col, type, null, state.context);
    return state.context = c;
  }
  function popContext(state) {
    var t = state.context.type;
    if (t == ")" || t == "]" || t == "}") {
      state.indented = state.context.indented;
    }
    return state.context = state.context.prev;
  }

  function isClosing(text, contextClosing) {
    if (text == contextClosing) {
      return true;
    } else {
      var closingKeywords = contextClosing.split(";");
      for (var i in closingKeywords) {
        if (text == closingKeywords[i]) {
          return true;
        }
      }
      return false;
    }
  }

  function buildElectricInputRegEx() {
    var allClosings = [];
    for (var i in openClose) {
      if (openClose[i]) {
        var closings = openClose[i].split(";");
        for (var j in closings) {
          allClosings.push(closings[j]);
        }
      }
    }
    var re = new RegExp("[{}()\\[\\]]|(" + allClosings.join("|") + ")$");
    return re;
  }
  return {
    electricInput: buildElectricInputRegEx(),

    startState: function(basecolumn) {
      var state = {
        tokenize: null,
        context: new Context((basecolumn || 0) - indentUnit, 0, "top", false),
        indented: 0,
        startOfLine: true
      };
      if (hooks.startState) hooks.startState(state);
      return state;
    },

    token: function(stream, state) {
      var ctx = state.context;
      if (stream.sol()) {
        if (ctx.align == null) ctx.align = false;
        state.indented = stream.indentation();
        state.startOfLine = true;
      }
      if (hooks.token) {
        var style = hooks.token(stream, state);
        if (style !== undefined) {
          return style;
        }
      }
      if (stream.eatSpace()) return null;
      curPunc = null;
      curKeyword = null;
      var style = (state.tokenize || tokenBase)(stream, state);
      if (style == "comment" || style == "meta" || style == "variable") return style;
      if (ctx.align == null) ctx.align = true;

      if (curPunc == ctx.type) {
        popContext(state);
      } else if ((curPunc == ";" && ctx.type == "statement") ||
               (ctx.type && isClosing(curKeyword, ctx.type))) {
        ctx = popContext(state);
        while (ctx && ctx.type == "statement") ctx = popContext(state);
      } else if (curPunc == "{") {
        pushContext(state, stream.column(), "}");
      } else if (curPunc == "[") {
        pushContext(state, stream.column(), "]");
      } else if (curPunc == "(") {
        pushContext(state, stream.column(), ")");
      } else if (ctx && ctx.type == "endcase" && curPunc == ":") {
        pushContext(state, stream.column(), "statement");
      } else if (curPunc == "newstatement") {
        pushContext(state, stream.column(), "statement");
      } else if (curPunc == "newblock") {
        if (curKeyword == "function" && ctx && (ctx.type == "statement" || ctx.type == "endgroup")) {
        } else if (curKeyword == "task" && ctx && ctx.type == "statement") {
        } else {
          var close = openClose[curKeyword];
          pushContext(state, stream.column(), close);
        }
      }

      state.startOfLine = false;
      return style;
    },

    indent: function(state, textAfter) {
      if (state.tokenize != tokenBase && state.tokenize != null) return CodeMirror.Pass;
      if (hooks.indent) {
        var fromHook = hooks.indent(state);
        if (fromHook >= 0) return fromHook;
      }
      var ctx = state.context, firstChar = textAfter && textAfter.charAt(0);
      if (ctx.type == "statement" && firstChar == "}") ctx = ctx.prev;
      var closing = false;
      var possibleClosing = textAfter.match(closingBracketOrWord);
      if (possibleClosing)
        closing = isClosing(possibleClosing[0], ctx.type);
      if (ctx.type == "statement") return ctx.indented + (firstChar == "{" ? 0 : statementIndentUnit);
      else if (closingBracket.test(ctx.type) && ctx.align && !dontAlignCalls) return ctx.column + (closing ? 0 : 1);
      else if (ctx.type == ")" && !closing) return ctx.indented + statementIndentUnit;
      else return ctx.indented + (closing ? 0 : indentUnit);
    },

    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    lineComment: "//",
    fold: "indent"
  };
});

  CodeMirror.defineMIME("text/x-verilog", {
    name: "verilog"
  });

  CodeMirror.defineMIME("text/x-systemverilog", {
    name: "verilog"
  });
  var tlvIdentifierStyle = {
    "|": "link",
    ">": "property",
    "$": "variable",
    "$$": "variable",
    "?$": "qualifier",
    "?*": "qualifier",
    "-": "hr",
    "/": "property",
    "/-": "property",
    "@": "variable-3",
    "@-": "variable-3",
    "@++": "variable-3",
    "@+=": "variable-3",
    "@+=-": "variable-3",
    "@--": "variable-3",
    "@-=": "variable-3",
    "%+": "tag",
    "%-": "tag",
    "%": "tag",
    ">>": "tag",
    "<<": "tag",
    "<>": "tag",
    "#": "tag",
    "^": "attribute",
    "^^": "attribute",
    "^!": "attribute",
    "*": "variable-2",
    "**": "variable-2",
    "\\": "keyword",
    "\"": "comment"
  };
  var tlvScopePrefixChars = {
    "/": "beh-hier",
    ">": "beh-hier",
    "-": "phys-hier",
    "|": "pipe",
    "?": "when",
    "@": "stage",
    "\\": "keyword"
  };
  var tlvIndentUnit = 3;
  var tlvTrackStatements = false;
  var tlvIdentMatch = /^([~!@#\$%\^&\*-\+=\?\/\\\|'"<>]+)([\d\w_]*)/;
  var tlvFirstLevelIndentMatch = /^[! ]  /;
  var tlvLineIndentationMatch = /^[! ] */;
  var tlvCommentMatch = /^\/[\/\*]/;
  function tlvScopeStyle(state, indentation, type) {
    var depth = indentation / tlvIndentUnit;
    return "tlv-" + state.tlvIndentationStyle[depth] + "-" + type;
  }
  function tlvIdentNext(stream) {
    var match;
    return (match = stream.match(tlvIdentMatch, false)) && match[2].length > 0;
  }

  CodeMirror.defineMIME("text/x-tlv", {
    name: "verilog",

    hooks: {

      electricInput: false,
      token: function(stream, state) {
        var style = undefined;
        var match;
        if (stream.sol() && ! state.tlvInBlockComment) {
          if (stream.peek() == '\\') {
            style = "def";
            stream.skipToEnd();
            if (stream.string.match(/\\SV/)) {
              state.tlvCodeActive = false;
            } else if (stream.string.match(/\\TLV/)){
              state.tlvCodeActive = true;
            }
          }
          if (state.tlvCodeActive && stream.pos == 0 &&
              (state.indented == 0) && (match = stream.match(tlvLineIndentationMatch, false))) {
            state.indented = match[0].length;
          }
          var indented = state.indented;
          var depth = indented / tlvIndentUnit;
          if (depth <= state.tlvIndentationStyle.length) {

            var blankline = stream.string.length == indented;
            var chPos = depth * tlvIndentUnit;
            if (chPos < stream.string.length) {
              var bodyString = stream.string.slice(chPos);
              var ch = bodyString[0];
              if (tlvScopePrefixChars[ch] && ((match = bodyString.match(tlvIdentMatch)) &&
                  tlvIdentifierStyle[match[1]])) {
                indented += tlvIndentUnit;
                if (!(ch == "\\" && chPos > 0)) {
                  state.tlvIndentationStyle[depth] = tlvScopePrefixChars[ch];
                  if (tlvTrackStatements) {state.statementComment = false;}
                  depth++;
                }
              }
            }
            if (!blankline) {
              while (state.tlvIndentationStyle.length > depth) {
                state.tlvIndentationStyle.pop();
              }
            }
          }
          state.tlvNextIndent = indented;
        }

        if (state.tlvCodeActive) {

          var beginStatement = false;
          if (tlvTrackStatements) {
            beginStatement =
                   (stream.peek() != " ") &&
                   (style === undefined) &&
                   !state.tlvInBlockComment &&
                   (stream.column() == state.tlvIndentationStyle.length * tlvIndentUnit);
            if (beginStatement) {
              if (state.statementComment) {
                beginStatement = false;
              }
              state.statementComment =
                   stream.match(tlvCommentMatch, false);
            }
          }

          var match;
          if (style !== undefined) {
            style += " " + tlvScopeStyle(state, 0, "scope-ident")
          } else if (((stream.pos / tlvIndentUnit) < state.tlvIndentationStyle.length) &&
                     (match = stream.match(stream.sol() ? tlvFirstLevelIndentMatch : /^   /))) {
            style =
                    "tlv-indent-" + (((stream.pos % 2) == 0) ? "even" : "odd") +
                    " " + tlvScopeStyle(state, stream.pos - tlvIndentUnit, "indent");
            if (match[0].charAt(0) == "!") {
              style += " tlv-alert-line-prefix";
            }
            if (tlvIdentNext(stream)) {
              style += " " + tlvScopeStyle(state, stream.pos, "before-scope-ident");
            }
          } else if (state.tlvInBlockComment) {
            if (stream.match(/^.*?\*\//)) {
              state.tlvInBlockComment = false;
              if (tlvTrackStatements && !stream.eol()) {
                state.statementComment = false;
              }
            } else {
              stream.skipToEnd();
            }
            style = "comment";
          } else if ((match = stream.match(tlvCommentMatch)) && !state.tlvInBlockComment) {
            if (match[0] == "//") {
              stream.skipToEnd();
            } else {
              state.tlvInBlockComment = true;
            }
            style = "comment";
          } else if (match = stream.match(tlvIdentMatch)) {
            var prefix = match[1];
            var mnemonic = match[2];
            if (// is identifier prefix
                tlvIdentifierStyle.hasOwnProperty(prefix) &&
                (mnemonic.length > 0 || stream.eol())) {
              style = tlvIdentifierStyle[prefix];
              if (stream.column() == state.indented) {
                style += " " + tlvScopeStyle(state, stream.column(), "scope-ident")
              }
            } else {
              stream.backUp(stream.current().length - 1);
              style = "tlv-default";
            }
          } else if (stream.match(/^\t+/)) {
            style = "tlv-tab";
          } else if (stream.match(/^[\[\]{}\(\);\:]+/)) {
            style = "meta";
          } else if (match = stream.match(/^[mM]4([\+_])?[\w\d_]*/)) {
            style = (match[1] == "+") ? "tlv-m4-plus" : "tlv-m4";
          } else if (stream.match(/^ +/)){
            if (stream.eol()) {
              style = "error";
            } else {
              style = "tlv-default";
            }
          } else if (stream.match(/^[\w\d_]+/)) {
            style = "number";
          } else {
            stream.next();
            style = "tlv-default";
          }
          if (beginStatement) {
            style += " tlv-statement";
          }
        } else {
          if (stream.match(/^[mM]4([\w\d_]*)/)) {
            style = "tlv-m4";
          }
        }
        return style;
      },

      indent: function(state) {
        return (state.tlvCodeActive == true) ? state.tlvNextIndent : -1;
      },

      startState: function(state) {
        state.tlvIndentationStyle = [];
        state.tlvCodeActive = true;
        state.tlvNextIndent = -1;
        state.tlvInBlockComment = false;
        if (tlvTrackStatements) {
          state.statementComment = false;
        }
      }

    }
  });
});
