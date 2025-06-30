/*

	COMPONENT : ConfigEditor

	Interactive user controls for configuring a genome plot

*/
const EventsMixin = require('./events_simple');
const fs = require('fs');
const tree_utils = require('./tree_utils');
const colormap = require('./colormap');

function getel (query,parent=document) { return parent.querySelector(query); }
function getels(query,parent=document) { return parent.querySelectorAll(query); }
function random_color() {
	let [r,g,b] = colormap[Math.floor(Math.random() * (colormap.length-1))];
	return `rgb(${r},${g},${b})`;
}

function Tree(user_opts)
{
	if (this.constructor != Tree) return new Tree(user_opts);
	let self = this;
	EventsMixin(self);
	self.on('select');
	self.on('unselect');

	let default_opts = {
		direction : 'vertical',  // horizontal: direction that the tree will be drawn in
		drawing_mode : 'right',  // fixed | distance | right: determines how label position will be determined
		node_inset : 10,         // pixels, base inset to apply to all nodes before distance
		node_multiple : 2000,    // multiply the distance by this value to produce pixel offset (inset is then added)
		node_color : 'black',    // the colour of the circle used to represent a node handle
		node_radius : 2,         // radius for the node circle
		font_type : 'monospace', // font-family used at the leaves
		font_size : 10,          // pixels: size of the text used at the leaves
		font_padding : 1,        // pixels: the space between lines
		font_color : 'black',    // color of the leaf text
		font_style : '',         // override other values on collision (CSS style)
		clade_cutoff : 1.0,      // set to a threshold beneath which clades will be assigned
		clade_colors : false,    // if true then randomly colour the clades
		selected : [],           // list of leaf IDs to show as highlighted
		collapsed : [],          // list of node IDs to show as collapsed
		line_weight : 1,         // pixels: the width of relationship lines in the tree when not collapsed
		line_weight2 : 10,       // pixels: as above by when collapsed
		line_dash : null,        // null for no dash or [dash,space], eg [3,2]
		line_color : 'black',    // colour of the line when not collapsed
		line_color2 : 'red'      // as above when collapsed
	};
	let opts = Object.assign(default_opts, user_opts || {});

	let style = `
	<style>
		#container {
			position : relative;
		}
		canvas, #hotspots {
			position : absolute;
			left : 0px;
			top : 0px;
			border : 0px;
			//transform: rotate(180deg);
		}
		#lower    { z-index: 0; }
		#upper    { z-index: 1; }
		#hotspots { z-index: 2; background:red; }

		.nodes {
			position : absolute;
		    background: #f00;
		    width: 4px;
		    height: 4px;
		    border-radius: 2px;
		}
		.node {
			position : absolute;
			display : none;
		}
		.leaf {
			position : absolute;
			display : none;
			white-space : nowrap;
			font-family : ${opts.font_type};
			font-size : ${opts.font_size}px;
			padding : ${opts.font_padding}px;
			color : ${opts.font_color};
		}
	</style>`;

	let html = `
	<div id='container'>
		<canvas id='lower'></canvas>
		<canvas id='upper'></canvas>
		<div id='hotspots'></div>
	</div>`;

	// build the shadow DOM
	let outer = document.createElement('div');
	let inner = outer.createShadowRoot({mode:'open'});
	inner.innerHTML = style + html;

	let canvas1 = inner.getElementById('lower');
	let canvas2 = inner.getElementById('upper');

	canvas1.width = 500;
	canvas2.width = 500;
	canvas1.height = 500;
	canvas2.height = 500;

	let hotspots = inner.getElementById('hotspots');

	let ctx1 = canvas1.getContext('2d');
	let ctx2 = canvas2.getContext('2d');

	let max_distance = 1.0;
	let max_depth = 0;
	let tree = null;
	let leaves = {};
	let leafnodes = {};
	let selected = {};

	// load newick data
	function load(newick_file)
	{
		tree = tree_utils.load_newick(newick_file);
		leaves = tree_utils.get_leaves(tree);
		max_distance = tree_utils.get_max_score(tree);
		max_depth = tree_utils.get_max_depth(tree);

		// initialize some additional values for the tree
		tree_utils.walk_df(tree, node => {
			node.xpos = undefined;
			node.ypos = undefined;
			node.ypos1 = undefined;
			node.ypos2 = undefined;
			node.xpct = undefined;
			node.ypct = undefined;
			node.ypct1 = undefined;
			node.ypct2 = undefined;
			node.visible = true;
			node.pct_depth = node.depth / max_depth;
			node.pct_score = node.sum_value / max_distance;
			node.dom = document.createElement('div');

			if (node.leaf) {
				node.dom.className = 'leaf';
				node.dom.addEventListener('mouseover', function(e) { this.style.border = 'dotted black 1px'; });
				node.dom.addEventListener('mouseout', function(e) { this.style.border = ''; });
				node.dom.addEventListener('click', function(e) { e.stopPropagation(); select(this); });
			}
			else {
				node.dom.className = 'node';
				node.dom.addEventListener('mouseover', function(e) { this.style.backgroundColor = 'green'; });
				node.dom.addEventListener('mouseout', function(e) { this.style.backgroundColor = ''; });
				node.dom.addEventListener('click', function(e) { toggle_visibility(node); });
			}
			hotspots.appendChild(node.dom);
		});

		// resize the canvases as needed
		//resize( calculate_width(tree), calculate_height(tree) );
		resize(200,10600);
		console.log(calculate_width(tree), calculate_height(tree));
	}

	// resize the canvases
	function resize(w,h)
	{
		w = Math.round(w);
		h = Math.round(h);

		canvas1.width = w;
		canvas2.width = w;

		canvas1.height = h;
		canvas2.height = h;

		ctx1 = canvas1.getContext('2d');
		ctx2 = canvas2.getContext('2d');
	}

	// the height of the canvas depends on the number of leaves, label size and spacing
	function calculate_height() {
		return leaves.length * (opts.font_size + opts.font_padding + opts.font_padding);
	}

	// the width of the canvas depends on the depth of the tree, the drawing mode, and the length of the labels
	function calculate_width() {
		ctx1.font = opts.font_size + 'px ' + opts.font_family;

		// determine the width of the longest label
		let max_label = Math.max(...leaves.map(leaf=>ctx1.measureText(leaf).width));

		return (max_distance * opts.node_multiple) + (max_depth * opts.node_inset) + max_label;
	}

	// draw the tree
	function render()
	{
		console.assert(tree !== null);

		// clear the canvases and the hotspots
		ctx1.clearRect(0, 0, ctx1.canvas.width, ctx1.canvas.height);
		ctx2.clearRect(0, 0, ctx2.canvas.width, ctx2.canvas.height);
		calculate_positions(tree);
		draw_from_node(tree, opts.font_color, opts.line_color, opts.node_color);
	}

	// draw the tree from a specified starting node (assumes positions have already been assigned)
	function draw_from_node(start_node, leaf_color, line_color, node_color)
	{
		// convert positions from relative to absolute
		tree_utils.walk_df(start_node, node => {
			if (node.leaf) {
				node.xpos = canvas1.width;
				node.ypos = Math.round(node.ypct * canvas1.height);
			}
			else {
				node.xpos = Math.round(node.xpct * canvas1.width);
				node.ypos = Math.round(node.ypct * canvas1.height);
				node.ypos1 = Math.round(node.ypct1 * canvas1.height);
				node.ypos2 = Math.round(node.ypct2 * canvas1.height);
			}
		});

		// options for drawing leaf labels
		let leaf_opts = {
			x : 0,
			y : 0,
			angle  : 0.0,
			valign : 'bottom', //top, bottom, middle, hanging, ideographic, alphabetic
			vshift : 0,
			hshift : 0,
			halign : 'left', //left, right, center, start, end
			font   : opts.font_size + 'px ' + opts.font_face,
			color  : leaf_color || opts.font_color,
			text   : ''
		};

		// options for drawing lines between nodes
		let line_opts = {
			x1:0, y1:0,
			x2:0, y2:0,
			thickness : opts.line_weight,
			color : line_color || opts.line_color
		};

		// options for drawing circles at internal nodes
		let node_opts = {
			x : 0,
			y : 0,
			radius : opts.node_radius,
			color : node_color || opts.node_color
		};

		// draw the tree
		let shift = opts.font_padding + (opts.font_size / 2);

		tree_utils.walk_df(start_node, node => {

			if (node.visible === false) {
				node.dom.style.display = 'none';
				return;
			}
			node.dom.style.display = 'block';

			// draw the connector line to the parent node
			if (node.parent) {
				draw_line(ctx1, Object.assign(line_opts, {
					x1 : node.parent.xpos,
					x2 : node.xpos,
					y1 : node.ypos + shift,
					y2 : node.ypos + shift
				}));
			}

			// draw the connector line spanning child nodes
			if (node.leaf === false) {
				draw_line(ctx1, Object.assign(node_opts, {
					x1 : node.xpos,
					x2 : node.xpos,
					y1 : node.ypos1 + shift,
					y2 : node.ypos2 + shift
				}));
			}

			// render an internal node
			if (node.leaf === false)
			{
				// draw a circle on the lower canvas
				draw_dot(ctx1, Object.assign(node_opts, {
					x : node.xpos,
					y : node.ypos + shift
				}));

				// create a hotspot for toggling visibility of the sub-tree
				let div = node.dom;
				Object.assign(div.style, {
					position : 'absolute',
					display : 'block',
					left : (node.xpos - 2 * node_opts.radius) + 'px',
					top : (shift + node.ypos - 2 * node_opts.radius) + 'px',
					width : (4 * node_opts.radius) + 'px',
					height : (4 * node_opts.radius) + 'px',
					borderRadius : (2 * node_opts.radius) + 'px'
				});
			}

			// render a leaf node
			if (node.leaf === true)
			{
				let div = node.dom;
				div.innerHTML = node.label;
				Object.assign(div.style, {
					display : 'block',
					position : 'absolute',
					color : leaf_opts.color,
					left : node.xpos + 'px',
					top : node.ypos + 'px'
				});
			}
		});
	}

	let clicker = null;

	// toggle the visibility of a node
	function toggle_visibility(node)
	{
		if (clicker != null)
		{
			clearTimeout(clicker);
			clicker = null;
			tree_utils.walk_df(node, n => n.visible = !n.visible);
			node.visible = true;
			render();
		}
		else {
			clicker = setTimeout(() => {
				clicker = null;
				if (!node.selected) {
					node.selected = true;
					subtree_color(node, 'red');
				}
				else {
					node.selected = false;
					subtree_color(node, opts.node_color);
				}
			},200);
		}
	}

	// set the colour of a subtree
	function subtree_color(node, color='black') {
		draw_from_node(node, 'white','white','white');
		draw_from_node(node, color, color, color);
	}

	// draw a line between two points
	function draw_line(ctx,useropts)
	{
		let opts = Object.assign({
			x1:0, y1:0,
			x2:0, y2:0,
			thickness : 0.5,
			color : 'black',
			dash : null,
		}, useropts);

		ctx.lineWidth = opts.thickness;
		ctx.strokeStyle = opts.color;
		if (opts.dash) ctx.setLineDash(opts.dash);
		ctx.beginPath();
		ctx.moveTo(opts.x1, opts.y1);
		ctx.lineTo(opts.x2, opts.y2);
		ctx.stroke();
	}

	// draw text with the option for alignment and rotation
	function draw_text(ctx,useropts)
	{
		let opts = Object.assign({
			x : 0,
			y : 0,
			angle  : 0.0,
			valign : 'bottom', //top, bottom, middle, hanging, ideographic, alphabetic
			vshift : 0,
			hshift : 0,
			halign : 'left', //left, right, center, start, end
			font   : '10px arial',
			color  : 'black',
			text   : ''
		}, useropts);

		ctx.save();
		ctx.font = opts.font;
		ctx.textAlign = opts.halign;
		ctx.textBaseline = opts.valign;
		ctx.fillStyle = opts.color;
		ctx.translate(opts.x, opts.y);
		ctx.rotate(opts.angle);
		ctx.fillText(opts.text,opts.hshift,opts.vshift);
		ctx.restore();
	}

	// draw a filled circle
	function draw_dot(ctx,useropts)
	{
		let opts = Object.assign({
			x : 0,
			y : 0,
			angle1 : 0,
			angle2 : 2 * Math.PI,
			radius : 100,
			color  : 'black'
		}, useropts);

		ctx.fillStyle = opts.color;
		ctx.beginPath();
		ctx.arc(opts.x, opts.y, opts.radius, opts.angle1, opts.angle2);
		ctx.fill();
	}

	// draw the tree in fixed branch length mode. All branches are the same length (labels are ragged)
	function draw_fixed(orientation='right')
	{
	}

	// draw the tree in distance mode. Branch length is determined by distance with the option for an offset (labels are ragged)
	function draw_distance(orientation='right')
	{
	}

	// assign X and Y positions as fractions between 0 and 1
	function calculate_positions(tree)
	{
		// extract leaves in depth-first order and nodes in breadth-first order
		let leaves = [];
		let nodes = [];

		tree_utils.walk_df(tree, node => { if (node.leaf) leaves.push(node); });
		tree_utils.walk_bf(tree, node => { if (!node.leaf) nodes.push(node); });

		// count the number of leaves that are actually visible
		let num_visible = 0; leaves.forEach( (leaf) => { if (leaf.visible) ++num_visible; });
		let num = 0;

		// assign positions to the leaves
		for (let leaf of leaves) {
			leaf.xpct = leaf.pct_depth;
			leaf.ypct = num / num_visible;
			if (leaf.visible) ++num;
		}

		// assign positions to the nodes
		while (nodes.length) {
			let node = nodes.pop();
			node.xpct = node.pct_depth;
			node.ypct1 = node.children[0].ypct;
			node.ypct2 = node.children[node.children.length - 1].ypct;
			node.ypct = 0.5 * (node.ypct1 + node.ypct2);
		}
	}

	function select(el)
	{
		let label = el.innerHTML.trim();
		if (selected[label]) {
			el.style.backgroundColor = '';
			selected[label] = false;
		}
		else {
			selected[label] = true;
			el.style.backgroundColor = 'lightgreen';
		}
		console.log(selected[label],label);
	}

	function collapse(el)
	{
		if (el.active) {
			el.style.backgroundColor = 'red';
			el.style.height = '4px';
			el.parentNode.removeChild(el.rbox);
		}
		else {
			el.style.backgroundColor = 'black';
			el.style.height = '1px';
			el.parentNode.appendChild(el.rbox);
		}
		el.active = !el.active;
	}

	function expand_all()
	{
		tree_utils.walk_bf(tree, node => node.visible = true);
	}

	return { load, render, expand_all, dom : outer };
}
module.exports = Tree;
