/*
	# Day 67: 2017-Mar-09 (Thu): first version

	Widget for showing and interacting with the project's data
*/
const EventsMixin = require('/Users/julian/Desktop/Code/javascript/readslam/lib/events_simple');
const fs = require('fs');

function getel (query,parent=document) { return parent.querySelector(query); }
function getels(query,parent=document) { return parent.querySelectorAll(query); }

// script loader that deals with collisions on export, module
function load_script(address)
{
	if (typeof module === 'object') {
		window.module = module;
		module = undefined;
	}
	let s = document.createElement('script');
	s.type = 'text/javascript';
	s.src = address;
	document.head.appendChild(s);

	if (window.module) {
		module = window.module;
	}
}

// API for interacting with the metadata table
function Table(config)
{
	console.assert(jQuery);

	if (this.constructor != Table) return new Table(config);
	let self = this;
	EventsMixin(self);
	self.on('select');
	self.on('unselect');

	let state = config || {};
	let style = `
		<style>
			@import "https://cdn.datatables.net/v/dt/dt-1.10.13/af-2.1.3/b-1.2.4/b-colvis-1.2.4/b-html5-1.2.4/cr-1.3.2/fc-3.2.2/fh-3.1.2/kt-2.2.0/rr-1.2.0/sc-1.4.2/se-1.2.0/datatables.min.css";
		</style>
	`;

	let html = `
	<table id='table' class='hover compact'>
		<thead>
			<tr>
				<th><input type='checkbox' /></th>
				<th>Assembly</th>
				<th>Reads</th>
				<th>BPA</th>
				<th>AUSPlot</th>
				<th>Family</th>
				<th>Species</th>
			</tr>
		</thead>

		<tbody></tbody>

		<tfoot></tfoot>
	</table>

	<div><button>Download</button> this table (CSV)</div>
	<div><button>Download</button> selected assemblies</div>
	`;

	// console.log(window.jQuery === undefined);
	// if (window.jQuery === undefined) load_script("https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js");
	// console.log(window.jQuery === undefined);
	// //load_script("./includes/colResizable-1.6.min.js");

	// build the shadow DOM
	let outer = document.createElement('div');
	let inner = outer.createShadowRoot({mode:'open'});
	inner.innerHTML = style + html;

	// get references to active elements
	let els = {
		table : getel('table',inner),
		tbody : getel('tbody',inner)
	};

	// hook up the functionality
	// todo

	let cols = {};
	let rows = [];
	let active = [];

	function load(ifile)
	{
		els.tbody.innerHTML = fs.readFileSync(ifile).toString();

		let trs = getels('tr',els.tbody);

		for (let i=0; i<trs.length; ++i)
		{
			let tds = getels('td', trs[i]);
			tds[0].innerHTML = `<input type='checkbox'></input>`;
			tds[1].innerHTML = `<button onclick="download_fasta('${tds[1].innerHTML}');">FastA</button>`;
			tds[2].innerHTML = `<button onclick="download_fastq('${tds[2].innerHTML}');">FastQ</button>`;
		}

		// rows = fs.readFileSync(ifile)
		// 	.toString()
		// 	.split("\n")
		// 	.map( line => line.trim().split(',') )
		// 	.filter( row => row.length == 19)
		// ;
		//
		// // extract the headers
		// cols = {};
		//
		// rows.shift().forEach( (val,key) => {
		// 	cols[val] = key;
		// 	cols[key] = val;
		// });
	}

	function render()
	{
		$(els.table).DataTable({
			scrollY : "600px",
  			scrollCollapse : true,
			paging : false
		});
		// let html = [];
		//
		// for (let row of rows)
		// {
		// 	html.push(`<tr>
		// 		<td><input type='checkbox' /></td>
		// 		<td><button>FastA</button></td>
		// 		<td><a target='new' href=''>reads</a></td>
		// 		<td>${row.join('</td><td>')}</td>
		// 	</tr>`);
		// }
		// els.tbody.innerHTML = html.join('\n');
	}

	return { load, render, dom : outer };
}
module.exports = Table;
