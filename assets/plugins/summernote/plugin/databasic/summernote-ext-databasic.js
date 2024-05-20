(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('jquery'));
  } else {
    factory(window.jQuery);
  }
}(function($) {
  var ui = $.summernote.ui;
  var dom = $.summernote.dom;
  var DataBasicPlugin = function(context) {
    var self = this;
    var options = context.options;
    var lang = options.langInfo;

    self.icon = '<i class="fa fa-object-group"/>';
    context.memo('button.databasic', function() {
      return ui.button({
        contents: self.icon,
        tooltip: lang.databasic.insert,
        click: context.createInvokeHandler('databasic.showDialog'),
      }).render();
    });
    context.memo('button.databasicDialog', function() {
      return ui.button({
        contents: self.icon,
        tooltip: lang.databasic.edit,
        click: context.createInvokeHandler('databasic.showDialog'),
      }).render();
    });
    context.memo('button.databasicSize100', function() {
      return ui.button({
        contents: '<span class="note-fontsize-10">100%</span>',
        tooltip: lang.image.resizeFull,
        click: context.createInvokeHandler('editor.resize', '1'),
      }).render();
    });
    context.memo('button.databasicSize50', function() {
      return ui.button({
        contents: '<span class="note-fontsize-10">50%</span>',
        tooltip: lang.image.resizeHalf,
        click: context.createInvokeHandler('editor.resize', '0.5'),
      }).render();
    });
    context.memo('button.databasicSize25', function() {
      return ui.button({
        contents: '<span class="note-fontsize-10">25%</span>',
        tooltip: lang.image.resizeQuarter,
        click: context.createInvokeHandler('editor.resize', '0.25'),
      }).render();
    });

    self.events = {
      'summernote.init': function(we, e) {
        $('data.ext-databasic', e.editable).each(function() { self.setContent($(this)); });
      },
      'summernote.keyup summernote.mouseup summernote.change summernote.scroll': function() {
        self.update();
      },
      'summernote.dialog.shown': function() {
        self.hidePopover();
      },
    };

    self.initialize = function() {
      var $container = options.dialogsInBody ? $(document.body) : context.layoutInfo.editor;

      var body = '<div class="form-group row-fluid">' +
          '<label>' + lang.databasic.testLabel + '</label>' +
          '<input class="ext-databasic-test form-control" type="text" />' +
          '</div>';
      var footer = '<button href="#" class="btn btn-primary ext-databasic-save">' + lang.databasic.insert + '</button>';

      self.$dialog = ui.dialog({
        title: lang.databasic.name,
        fade: options.dialogsFade,
        body: body,
        footer: footer,
      }).render().appendTo($container);
      self.$popover = ui.popover({
        className: 'ext-databasic-popover',
      }).render().appendTo('body');
      var $content = self.$popover.find('.popover-content');

      context.invoke('buttons.build', $content, options.popover.databasic);
    };

    self.destroy = function() {
      self.$popover.remove();
      self.$popover = null;
      self.$dialog.remove();
      self.$dialog = null;
    };

    self.update = function() {
      if (!context.invoke('editor.hasFocus')) {
        self.hidePopover();
        return;
      }

      var rng = context.invoke('editor.createRange');
      var visible = false;

      if (rng.isOnData()) {
        var $data = $(rng.sc).closest('data.ext-databasic');

        if ($data.length) {
          var pos = dom.posFromPlaceholder($data[0]);

          self.$popover.css({
            display: 'block',
            left: pos.left,
            top: pos.top,
          });
          context.invoke('editor.saveTarget', $data[0]);

          visible = true;
        }
      }
      if (!visible) {
        self.hidePopover();
      }
    };

    self.hidePopover = function() {
      self.$popover.hide();
    };
    self.getInfo = function() {
      var rng = context.invoke('editor.createRange');

      if (rng.isOnData()) {
        var $data = $(rng.sc).closest('data.ext-databasic');

        if ($data.length) {
          return {
            node: $data,
            test: $data.attr('data-test'),
          };
        }
      }

      return {};
    };

    self.setContent = function($node) {
      $node.html('<p contenteditable="false">' + self.icon + ' ' + lang.databasic.name + ': ' +
        $node.attr('data-test') + '</p>');
    };

    self.updateNode = function(info) {
      self.setContent(info.node
        .attr('data-test', info.test));
    };

    self.createNode = function(info) {
      var $node = $('<data class="ext-databasic"></data>');

      if ($node) {
        info.node = $node;
        context.invoke('editor.insertNode', $node[0]);
      }

      return $node;
    };

    self.showDialog = function() {
      var info = self.getInfo();
      var newNode = !info.node;
      context.invoke('editor.saveRange');

      self
        .openDialog(info)
        .then(function(dialogInfo) {
          ui.hideDialog(self.$dialog);
          context.invoke('editor.restoreRange');
          if (newNode) {
            self.createNode(info);
          }
          $.extend(info, dialogInfo);

          self.updateNode(info);
        })
        .fail(function() {
          context.invoke('editor.restoreRange');
        });
    };

    self.openDialog = function(info) {
      return $.Deferred(function(deferred) {
        var $inpTest = self.$dialog.find('.ext-databasic-test');
        var $saveBtn = self.$dialog.find('.ext-databasic-save');
        var onKeyup = function(event) {
          if (event.keyCode === 13) {
            $saveBtn.trigger('click');
          }
        };

        ui.onDialogShown(self.$dialog, function() {
          context.triggerEvent('dialog.shown');

          $inpTest.val(info.test).on('input', function() {
            ui.toggleBtn($saveBtn, $inpTest.val());
          }).trigger('focus').on('keyup', onKeyup);

          $saveBtn
            .text(info.node ? lang.databasic.edit : lang.databasic.insert)
            .click(function(event) {
              event.preventDefault();

              deferred.resolve({ test: $inpTest.val() });
            });
          ui.toggleBtn($saveBtn, $inpTest.val());
        });

        ui.onDialogHidden(self.$dialog, function() {
          $inpTest.off('input keyup');
          $saveBtn.off('click');

          if (deferred.state() === 'pending') {
            deferred.reject();
          }
        });

        ui.showDialog(self.$dialog);
      });
    };
  };
  $.extend(true, $.summernote, {
    plugins: {
      databasic: DataBasicPlugin,
    },

    options: {
      popover: {
        databasic: [
          ['databasic', ['databasicDialog', 'databasicSize100', 'databasicSize50', 'databasicSize25']],
        ],
      },
    },
    lang: {
      'en-US': {
        databasic: {
          name: 'Basic Data Container',
          insert: 'insert basic data container',
          edit: 'edit basic data container',
          testLabel: 'test input',
        },
      },
    },

  });
}));
