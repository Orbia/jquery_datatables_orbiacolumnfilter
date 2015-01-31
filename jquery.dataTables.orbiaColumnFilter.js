/*! OrbiaColumnFilter 0.1.0
* Copyright © 2015 Michał Biarda
*/

/**
* @summary OrbiaColumnFilter
* @description jQuery DataTables 1.10 plugin for column filtering
* @version 0.1.0
* @file jquery.dataTables.orbiaColumnFilter.js
* @author Michał Biarda
* @contact m.biarda@gmail.com
* @copyright Copyright 2015 Michał Biarda
*
* This source file is free software, available under the following license:
* MIT license - http://opensource.org/licenses/MIT
*
* This source file is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
* or FITNESS FOR A PARTICULAR PURPOSE. See the license files for details.
*/

(function($) {
	
	/**
	 * OrbiaColumnFilter is a plugin used for applying column filters to
	 * DataTables ver. 1.10.
	 * 
	 * Filter can be applied to any column using "orbiaColumnFilter" param in
	 * "columns" or "columnDefs" DataTables options.
	 * 
	 * Column must be searchable to apply filter to.
	 * 
	 * There are three types of filters:
	 * 
	 * "text" - uses text input and works similar to MySQL "LIKE",
	 * "number-range" - uses two text inputs and works similar to MySQL "BETWEEN",
	 * "select" - uses select input and works similar to MySQL "=" (one should
	 *		manually set select options by "values" object - see example).
	 * 
	 * If DataTable is run with "bServerSide" option set to true, for each input
	 * value change request params "columns[X][search][value]" values are prepared
	 * in the following way:
	 * 
	 * "text" - "like:<value from input>",
	 * "number-range" - "range:<value from first input>~<value from second input>",
	 * "select" - "equals:<value from select>".
	 * 
	 * @param {DataTable} api - DataTable API instance
	 * @param {object} options - Configuration object for the plugin. Possible
	 *		options and their values:
	 *		
	 * "appendTo": "header" (default) or "footer" - controls in what table part
	 *		filters row should be rendered.
	 * 
	 * @example
	 * 
	 *	$(document).ready(function {
	 *      var api = $("#example").DataTable({
	 *			"columnDefs": {
	 *				{
	 *					"targets": [0],
	 *					"orbiaColumnFilter": {
	 *						"type": "number-range"
	 *					}
	 *				},
	 *				{
	 *					"targets": [1],
	 *					"orbiaColumnFilter": {
	 *						"type": "text"
	 *					}
	 *				},
	 *				{
	 *					"targets": [2],
	 *					"orbiaColumnFilter": {
	 *						"type": "select",
	 *						"values": {
	 *							"male": "Male",
	 *							"female": "Female",
	 *							"other": "Don't know"
	 *						}
	 *					}
	 *				}
	 *			}
	 *      });
	 *      new $.fn.dataTable.OrbiaColumnFilter(api, {
	 *			"appendTo": "footer"
	 *      });
	 *  });
	 */
	$.fn.dataTable.OrbiaColumnFilter = function(api, options) {
		options = $.extend({
			'appendTo': 'header'
		}, options || {});
		var enabled = false;
		var items = [];
		var settings = api.settings()[0];
		$.each(settings.aoColumns, function() {
			items[this.idx] = null;
			if (this.orbiaColumnFilter && this.bSearchable) {
				items[this.idx] = this.orbiaColumnFilter;
				enabled = true;
			}
		});
		if (enabled) {
			var serverSide = settings.oFeatures.bServerSide;
			var tableId = settings.sTableId;
			var tr = $('<tr>')
					.addClass(settings.oClasses.sOrbiaFilterRow)
					.attr('id', tableId + '_orbia_column_filters');
			api.columns().flatten().each(function(columnIndex) {
				var item = items[columnIndex];
				if (api.column(columnIndex).visible()) {
					var th = $('<th>');
					if (item) {
						switch (item.type) {
							case 'text':
								$('<input>').attr('type', 'text').bind('input change', function(e) {
									var $this = $(this);
									var val = $this.val();
									if ($this.data('val') !== val) {
										$this.data('val', val);
										if (serverSide && val) {
											val = 'like:' + val;
										}
										api.column(columnIndex).search(val);
										if (tr.data('timeout')) {
											clearTimeout(tr.data('timeout'));
										}
										tr.data('timeout', setTimeout(function() {
											api.draw();
										}, 500));
									}
								}).appendTo(th);
								break;
							case 'select':
								var select = $('<select>').bind('change', function(e) {
									var $this = $(this);
									var val = $.fn.dataTable.util.escapeRegex($this.val());
									if ($this.data('val') !== val) {
										$this.data('val', val);
										if (serverSide && val) {
											val = 'equals:' + val;
										} else if (val) {
											val = '^' + val + '$';
										}
										api.column(columnIndex).search(val, true);
										if (tr.data('timeout')) {
											clearTimeout(tr.data('timeout'));
										}
										tr.data('timeout', setTimeout(function() {
											api.draw();
										}, 500));
									}
								}).append('<option>');
								if (item.values) {
									$.each(item.values, function(key) {
										$('<option>').attr('value', key).text(this).appendTo(select);
									});
								}
								select.appendTo(th);
								break;
							case 'number-range':
								var from = $('<input>').attr('type', 'text').data('val', '');
								var to = $('<input>').attr('type', 'text').data('val', '');
								if (serverSide) {
									from.bind('input change', function(e) {
										var $this = $(this);
										var valFrom = $this.val();
										var valTo = $this.closest("th").find("input:eq(1)").val();
										var val = '';
										if (valFrom !== '' || valTo !== '') {
											val = 'range:' + valFrom + '~' + valTo;
										}
										if ($this.data('val') !== val) {
											$this.data('val', val);
											api.column(columnIndex).search(val);
											if (tr.data('timeout')) {
												clearTimeout(tr.data('timeout'));
											}
											tr.data('timeout', setTimeout(function() {
												api.draw();
											}, 500));
										}
									});
									to.bind('input change', function(e) {
										var $this = $(this);
										var valFrom = $this.closest("th").find("input:eq(0)").val();
										var valTo = $this.val();
										var val = '';
										if (valFrom !== '' || valTo !== '') {
											val = 'range:' + valFrom + '~' + valTo;
										}
										if ($this.data('val') !== val) {
											$this.data('val', val);
											api.column(columnIndex).search(val);
											if (tr.data('timeout')) {
												clearTimeout(tr.data('timeout'));
											}
											tr.data('timeout', setTimeout(function() {
												api.draw();
											}, 500));
										}
									});
								} else {
									$.fn.dataTable.ext.search.push(
										(function (ci, nTable) {
											return function (settings, data, dataIndex) {
												if (settings.nTable !== nTable) {
													return false;
												}
												var min = parseFloat(from.val().replace(',', '.'));
												var max = parseFloat(to.val().replace(',', '.'));
												var value = parseFloat(data[ci]) || 0;
												return ((isNaN(min) && isNaN(max)) || (isNaN(min) && value <= max) || (min <= value && isNaN(max)) || (min <= value && value <= max));
											};
										})(columnIndex, api.table().node())
									);
									from.add(to).bind('input change', function() {
										api.draw();
									});
								}
								from.appendTo(th);
								to.appendTo(th);
								break;
							default:
								console && console.warn('Invalid orbiaColumnFilter type for column ' + value + '.');
						}
					}
					th.appendTo(tr);
				}
			});
			var $table = $(api.table().node());
			if (options.appendTo === 'footer') {
				if ($table.children("tfoot").length === 0) {
					$table.append($("<tfoot>"));
				}
				tr.appendTo($table.children("tfoot"));
			} else {
				if ($table.children("thead").length === 0) {
					$table.append($("<thead>"));
				}
				tr.appendTo($table.children("thead"));
			}
		}
	};
	$.fn.DataTable.OrbiaColumnFilter = $.fn.dataTable.OrbiaColumnFilter;

	/**
	 * CSS classess used by default in HTML elements rendered by the plugin.
	 */
	$.extend($.fn.dataTableExt.classes, {
		sOrbiaFilterRow: 'dataTables_orbia_column_filters',
		sOrbiaClearFilters: 'dataTables_orbia_clear_filters'
	});
	
	/**
	 * Default language strings used by the plugin.
	 */
	$.extend($.fn.dataTable.defaults.oLanguage, {
		oOrbiaColumnFilter: {
			sClearFilters: 'Clear filters'
		}
	});

	/**
	 * Clear filters DataTables DOM feature identified by "C" char.
	 * 
	 * Adds possibility to render button for clearing all the filters.
	 * 
	 * @example
	 * 
	 *	$(document).ready(function {
	 *      var api = $("#example").DataTable({
	 *			"columnDefs": { ... },
	 *			"dom": "lfCrtip"
	 *      });
	 *      new $.fn.dataTable.OrbiaColumnFilter(api);
	 *  });
	 */
	$.fn.dataTable.ext.feature.push( {
		fnInit: function(settings) {
			var language = settings.oLanguage;
			var tableId = settings.sTableId;
			var button = $("<button>")
					.html(language.oOrbiaColumnFilter.sClearFilters)
					.on('click', function() {
						$("#" + tableId + "_orbia_column_filters :input").each(function() {
							$(this).val('').trigger('change');
						});
					});
			var wrapper = $("<div>")
					.addClass(settings.oClasses.sOrbiaClearFilters)
					.attr('id', tableId + '_orbia_clear_filters');
			button.appendTo(wrapper);
			return wrapper.get(0);
		},
		cFeature: 'C'
	} );
	
})(jQuery);