/*

# Day 82: 2017-Mar-24 (Fri): created

A new version of the tree viewer that eliminates my own canvas helper library
and replaces it with the excellent fabric.js library.

When a new tree is loaded, every fabric object is created and assigned to
the tree. Any operation that impacts the display of the tree walks the tree,
recomputes fabric object variables then redraws the entire canvas.

Using fabric also allows really minimalistic serialization of the visual tree
into a JSON structure, though it's not complex to rebuild from a newick file.

mouse:over on a node triggers subtree highlighting
mouse:out on a node reverts the subtree
mouse:down on a node collapses or expands the subtree

*/
const EventsMixin = require('./events_simple');
const fs = require('fs');
const tree_utils = require('./tree_utils');
const colormap = require('./colormap');

function random_color() {
	let [r,g,b] = colormap[Math.floor(Math.random() * (colormap.length-1))];
	return `rgb(${r},${g},${b})`;
}

function Tree(user_opts)
{
	if (this.constructor != Tree) return new Tree(user_opts);
	let self = this;

	// add events
	EventsMixin(self);
	self.on('node:collapse');
	self.on('node:expand');
	self.on('node:select');
	self.on('node:unselect');
	self.on('leaf:select');
	self.on('leaf:unselect');

	// initialise state
	let default_opts = {
		draw_mode : 'fixed',
		branch_length : 10,
		leaf_font_family : 'monospace',
		leaf_font_size : 10,
		leaf_padding : 1,
		leaf_color : 'black',
		leaf_highlight_color : 'lightgreen',
		node_radius : 4,
		node_color : 'black',
		line_color : 'black',
		line_highlight_color : 'red',
		line_thickness : 2
	};
	let opts = Object.assign(default_opts, user_opts || {});

	let html = `<script src='fabric.min.js'></script><canvas></canvas>`;

	// build the shadow DOM
	let outer = document.createElement('div');
	let inner = outer.createShadowRoot({mode:'open'});
	inner.innerHTML = html;

	let fab = new fabric.Canvas(inner.querySelector('canvas'));
	fab.renderOnAddRemove = false; // IMPORTANT!!

	let max_distance = 1.0;
	let max_depth = 0;
	let tree = null;
	let leaves = [];
	let dirty = true;

	// FIXME: compute these somewhere more sensible
	let leaf_height = 0;
	let leaf_left = 0;

	// load newick data
	function load(newick_file)
	{
		tree = tree_utils.load_newick(newick_file);
		leaves = [];
		max_distance = tree_utils.get_max_score(tree);
		max_depth = tree_utils.get_max_depth(tree);

		// initialize some additional values for the tree
		tree_utils.walk_df(tree, node =>
		{
			node.visible = true;
			node.selected = false;

			if (node.leaf)
			{
				// textbox for the leaf
				node.textbox = new fabric.Text(node.label, {
					fontFamily : opts.leaf_font_family,
					fontSize   : opts.leaf_font_size,
					padding    : opts.leaf_padding,
					fill       : opts.leaf_color,
					selectable : false
				});
				node.textbox.on('mousedown', e => on_leaf_down(node));

				// line that connects up to a span line
				node.upline = new fabric.Line({
					stroke : opts.line_color,
					strokeWidth : opts.line_thickness
				});
				fab.add(node.textbox, node.upline);
				leaves.push(node);
			}
			else
			{
				// dot for the node
				node.dot = new fabric.Circle({
					radius     : opts.node_radius,
					fill       : opts.node_color,
					selectable : false,
					originX    : 'center',
					originY    : 'center'
				});
				node.dot.on('mouseover', e => on_node_over(node));
				node.dot.on('mouseout' , e => on_node_out(node));
				node.dot.on('mousedown', e => on_node_down(node));

				// line that connects up to a span line
				node.upline = new fabric.Line({
					stroke : opts.line_color,
					strokeWidth : opts.line_thickness
				});

				// line that spans the child nodes
				node.spanline = new fabric.Line({
					stroke : opts.line_color,
					strokeWidth : opts.line_thickness
				});

				fab.add(node.dot, node.upline, node.spanline);
			}

		});

		// set the size of the canvas so that it can fit the tree
		resize(calculate_width(tree), calculate_height(tree));
	}

	// resize the canvases
	function resize(w,h) {
		fab.setWidth(Math.round(w));
		fab.setHeight(Math.round(h));
	}

	// the height of the canvas depends on the number of leaves, label size and spacing
	function calculate_height() {
		leaf_height = leaves[0].textbox.getHeight();
		return leaves.length * leaves[0].textbox.getHeight();
	}

	// the width of the canvas depends on the depth of the tree, the drawing mode, and the length of the labels
	function calculate_width()
	{
		// determine the width of the longest label
		let max_label_width = 0;
		let max_depth = 0;

		for (let leaf of leaves) {
			if (leaf.depth > max_depth) max_depth = leaf.depth;
			let width = leaf.textbox.getWidth();
			if (width > max_label_width) max_label_width = width;
		}
		leaf_left = max_depth * opts.branch_length;
		return leaf_left + max_label_width;
	}

	function on_leaf_down(leaf) {
		if (leaf.selected) {
			self.fire('node:unselect',leaf);
			leaf.textbox.set('backgroundColor', '');
		}
		else {
			self.fire('node:select',leaf);
			leaf.textbox.set('backgroundColor', opts.leaf_highlight_color);
		}
		leaf.selected = !leaf.selected;
	}

	// make a node bigger when the mouse if over it
	function on_node_over(node) {
		node.dot.set('radius',node.dot.get('radius') + 2);
		render();
	}

	// make a node smaller when the mouse leaves it
	function on_node_out (node) {
		node.dot.set('radius',node.dot.get('radius') - 2);
		render();
	}

	// double click a node to collapse / expand, single click to highlight
	function on_node_down(node)
	{
		// toggle visibility on a double click
		if (on_node_down.clicker != null)
		{
			set_subtree_visibility(node,!node.visible);
			clearTimeout(on_node_down.clicker);
			self.fire('node:collapse',node);
			self.fire('node:expand',node);
		}

		// toggle the highlight of a subtree on a single click
		else {
			on_node_down.clicker = setTimeout(() => {
				on_node_down.clicker = null;
				if (!node.selected) {
					node.selected = true;
					set_subtree_color(node, opts.line_highlight_color);
				}
				else {
					node.selected = false;
					set_subtree_color(node, opts.line_color);
				}
			},200);
			self.fire('node:select',node);
			self.fire('node:unselect',node);
		}
	}
	on_node_down.clicker = null; // double click detector

	// redraw the tree
	function render() {
		recompute();
		fab.renderAll();
	}

	// recompute positions for visible nodes
	function recompute()
	{
		if (!dirty) return;
		// extract visible leaves in depth-first order and visible nodes in breadth-first order
		let leaves = [];
		let nodes = [];

		tree_utils.walk_df(tree, node => { if (node.leaf && node.visible) leaves.push(node); });
		tree_utils.walk_bf(tree, node => { if (!node.leaf && node.visible) nodes.push(node); });

		// assign positions to the leaves depending on drawing mode
		if (opts.draw_mode == 'fixed')
		{
			let half_height = leaf_height >>> 1;

			// leaves are lined up in a column
			for (let i=0; i<leaves.length; ++i) {
				let leaf = leaves[i];
				let x1 = (leaf.depth - 1) * opts.branch_length
				let x2 = leaf_left;
				let y1 = Math.round(i * leaf_height);
				let y2 = y1 + leaf_height;

				leaf.textbox.set({ left:x2, top:y1 });
				leaf.upline.set({ x1:x1, x2:x2, y1:y1+half_height, y2:y1+half_height, stroke:opts.line_color, strokeWeight : opts.line_thickness });
				leaf.textbox.setCoords();
			}

			// assign positions to the nodes
			while (nodes.length)
			{
				let node = nodes.pop();
				let x1 = node.parent ? node.parent.depth * opts.branch_length : 0;
				let x2 = node.depth * opts.branch_length;
				let y1 = node.children[0].upline.get('y1');
				let y2 = node.children[node.children.length - 1].upline.get('y1');
				let ymid = (y1+y2) >>> 1;

				node.upline.set({ x1:x1, x2:x2, y1:ymid, y2:ymid, stroke:opts.line_color, strokeWeight : opts.line_thickness });
				node.spanline.set({ x1:x2, x2:x2, y1:y1, y2:y2, stroke:opts.line_color, strokeWeight : opts.line_thickness });
				node.dot.set({ left:x2, top:ymid });
				node.dot.setCoords();
			}
		}
	}

	// set the colour of a subtree
	function set_subtree_color(start_node, color)
	{
		console.log('setting',color);
		// convert positions from relative to absolute
		tree_utils.walk_df(start_node, node => {
			if (node.leaf) {
				node.upline.set('stroke',color);
				node.textbox.set('fill',color);
			}
			else {
				node.upline.set('stroke',color);
				node.spanline.set('stroke',color);
				node.dot.set('fill',color);
			}
		});
		render();
	}

	// expand / collapse a subtree
	function set_subtree_visibility(node,state)
	{
		tree_utils.walk_df(node, n => {
			if (n.visible === state) return;
			n.visible = state;
			if (n.textbox) n.textbox.visible = state;
			if (n.dot && n != node) n.dot.visible = state;
			if (n.upline && n != node) n.upline.visible = state;
			if (n.spanline) n.spanline.visible = state;
		});
		dirty = true;
		render();
	}

	return { load, render, dom : outer };
}
module.exports = Tree;
