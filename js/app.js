$(function() {

	var editors = {},
		body = $('body'),
		usageElm = $('#usage')[0];

	CodeMirror.fromTextArea(usageElm, {
		readOnly: true,
		mode: 'javascript',
		matchBrackets : true
	});

	body.find('div.row').each(function (i, row) {
		var rowId = row.id,
			srcElm = $(row).find('textarea.source')[0],
			source = CodeMirror.fromTextArea(srcElm, {
				mode: 'sass',
				lineNumbers : true,
				matchBrackets : true
			}),
			outElm = $(row).find('textarea.target')[0];
			target = CodeMirror.fromTextArea(outElm, {
				readOnly: true,
				mode: 'sass',
				lineNumbers : true,
				matchBrackets : true
			});

		editors[rowId] = {src: source, out: target};
	});

	function regenerate(elem) {
		var rowId = $(elem).next()[0].id,
			srcEditor = editors[rowId].src,
			outEditor = editors[rowId].out,
			dialog = $('#alert'),
			scss = new SASS();

		try {
			scss.process(srcEditor.getValue());
			outEditor.setValue(scss.toCss());
		} catch (e) {
			outEditor.setValue('');
			dialog.find('p').text(e);
			dialog.modal('show');
		}
	}

	body.on('click', 'button.gen', function(elem) {
		regenerate(elem.target);
	});

	body.find('button.gen').forEach(function (elem) {
		regenerate(elem);
	});

});
