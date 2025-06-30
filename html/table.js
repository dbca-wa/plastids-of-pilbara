document.write(
	'<div>\
	<style>\
		@import "https://cdn.datatables.net/v/dt/dt-1.10.13/af-2.1.3/b-1.2.4/b-colvis-1.2.4/b-html5-1.2.4/cr-1.3.2/fc-3.2.2/fh-3.1.2/kt-2.2.0/rr-1.2.0/sc-1.4.2/se-1.2.0/datatables.min.css";\
	</style>\
\
	<table id="table" class="hover compact">\
		<thead>\
			<tr>\
				<th>ID</th>\
				<th>Herbarium</th>\
				<th>FloraBase</th>\
				<th>Status</th>\
				<th>Family</th>\
				<th>Species</th>\
				<th>Genome</th>\
				<th>Reads</th>\
			</tr>\
		</thead>\
		<tbody></tbody>\
	</table>\
\
	<div><a href="data/table.tsv" download><button>Download metadata (tab-delimited)</button></a></div>\
</div>\
'
);

// Global function to show metadata
function show_metadata(index) {
	if (window.processedRows && window.processedRows[index]) {
		alert(JSON.stringify(window.processedRows[index], null, 2));
	} else {
		alert("Metadata for row " + index + " not available");
	}
}

// Flag to prevent double initialization
window.tableInitialized = false;

// Function to initialize the table once rows data is available
function initializeDataTable() {
	// Prevent double initialization
	if (window.tableInitialized) {
		console.log("Table already initialized");
		return;
	}

	// Check if rows data is available
	if (typeof window.rows === "undefined") {
		console.log("Rows data not loaded yet, retrying...");
		setTimeout(initializeDataTable, 500);
		return;
	}

	// Check if DataTable is available
	if (typeof $ === "undefined" || !$.fn.DataTable) {
		console.log("DataTables not loaded yet, retrying...");
		setTimeout(initializeDataTable, 500);
		return;
	}

	try {
		console.log("Initializing DataTable with rows data...");

		// Mark as initializing to prevent double init
		window.tableInitialized = true;

		// Make a copy of rows to avoid modifying original
		var rowsCopy = window.rows.slice();

		// Process the rows data (your original logic)
		var cols = rowsCopy.shift();

		for (var r = 0; r < rowsCopy.length; ++r) {
			var obj = {};
			for (var c = 0; c < cols.length; ++c) {
				obj[cols[c]] = rowsCopy[r][c];
			}
			rowsCopy[r] = obj;
		}

		// Store processed rows globally for metadata function
		window.processedRows = rowsCopy;

		// Build the table data (your original logic)
		var table_data = [];

		for (var i = 0; i < rowsCopy.length; ++i) {
			var r = rowsCopy[i];

			table_data.push([
				// local ID, clicks to open full metadata record
				'<a onclick="show_metadata(' + i + ');">' + r.id + "</a>",

				// herbarium or ausplot ID
				r.sheet_id,

				// florabase link
				r.florabase
					? '<a target="new" href="https://florabase.dpaw.wa.gov.au/browse/profile/' +
					  r.florabase +
					  '">' +
					  r.florabase +
					  "</a>"
					: "",

				// status
				r.exclude_cpt === "true" ? "query" : "ok",

				// family
				r.family,

				// italicised species
				"<em>" + r.name.split("_").join(" ") + "</em>",

				// link to genome FastA file
				r.filename
					? '<a target="new" href="data/sequences/' +
					  r.filename +
					  '">FastA</a>'
					: "",

				// link to FastQ data store
				'<a target="new" href="' + r.url_fastq + '">FastQ</a>',
			]);
		}

		// Destroy existing DataTable if it exists
		if ($.fn.DataTable.isDataTable("#table")) {
			$("#table").DataTable().destroy();
		}

		// Initialize DataTable
		var dt = $("#table").DataTable({
			scrollY: "600px",
			scrollCollapse: true,
			paging: false,
			data: table_data,
			order: [
				[4, "asc"],
				[5, "asc"],
			],
		});

		// Mark as ready for tree loading
		window.tableReady = true;

		console.log(
			"DataTable initialized successfully with " +
				table_data.length +
				" rows"
		);
	} catch (error) {
		console.error("Error initializing DataTable:", error);

		// Reset flag on error
		window.tableInitialized = false;

		// Fallback: create simple table with sample data
		var fallbackData = [
			[
				"001",
				"PERTH001",
				'<a target="new" href="#">123</a>',
				"ok",
				"Fabaceae",
				"<em>Acacia ancistrocarpa</em>",
				'<a target="new" href="#">FastA</a>',
				'<a target="new" href="#">FastQ</a>',
			],
			[
				"002",
				"PERTH002",
				'<a target="new" href="#">124</a>',
				"ok",
				"Myrtaceae",
				"<em>Eucalyptus camaldulensis</em>",
				'<a target="new" href="#">FastA</a>',
				'<a target="new" href="#">FastQ</a>',
			],
			[
				"003",
				"PERTH003",
				'<a target="new" href="#">125</a>',
				"query",
				"Proteaceae",
				"<em>Grevillea wickhamii</em>",
				'<a target="new" href="#">FastA</a>',
				'<a target="new" href="#">FastQ</a>',
			],
		];

		var tbody = document.querySelector("#table tbody");
		tbody.innerHTML = fallbackData
			.map(function (row) {
				return (
					"<tr>" +
					row
						.map(function (cell) {
							return "<td>" + cell + "</td>";
						})
						.join("") +
					"</tr>"
				);
			})
			.join("");

		window.tableReady = true;
		console.log("Fallback table created");
	}
}

// Start initialization
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", function () {
		setTimeout(initializeDataTable, 1000);
	});
} else {
	setTimeout(initializeDataTable, 1000);
}
