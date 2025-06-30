/*

	# Day 60: 2017-Mar-02 (Thu):

	Various tree utilities starting from a .newick file

	Given a .newick file, extract out the tree as a JSON structure.

	Given a score threshold, break the tree into groups (in this case groups of PPRs)

	Generate a table that is GROUPS x SPECIES where the value is a count of PPRs in
	the group per species.

*/
const fs = require('fs');

// load a JS object (nested array) from a newick file
function load_newick(ifile)
{
	let buf = fs.readFileSync(ifile);

	let quoting = false;
	let quote = '';
	let escaping = false;

	for (let i=0; i<buf.length; ++i)
	{
		let c = String.fromCharCode(buf[i]);

		if (!quoting) {
			switch (c) {
				case "(": buf[i] = "[".charCodeAt(0); break;
				case ")": buf[i] = "]".charCodeAt(0); break;
				case ":": buf[i] = ",".charCodeAt(0); break;
				case ";": buf[i] = " ".charCodeAt(0); break;
				case "'": quoting = true; quote = c; buf[i] = '"'.charCodeAt(0); break;
				case '"': quoting = true; quote = c; break;
			}
		}
		else {
			if (escaping) {
				escaping = false;
			}
			else if (c == '\\') {
				escaping = true;
			}
			else if (c == quote) {
				quoting  = false;
				if (c == "'") buf[i] = '"'.charCodeAt(0);
			}
		}
	}
	return convert(JSON.parse(buf.toString()));
}

// convert a newick object to a more intuitive tree structure
function convert(newick_tree)
{
	let leaf_id = 0;

	function walk(node,shadow_node)
	{
		console.assert(node.length % 2 == 0);

		for (let i=0; i<node.length; ++i)
		{
			let child = node[i];
			let score = node[++i];

			console.assert(typeof child != 'number');
			console.assert(typeof score == 'number');

			let new_node = {
				leaf : false,
				label : '',
				value : score,
				parent : shadow_node,
				children : []
			};
			shadow_node.children.push(new_node);

			if (typeof child === 'string') {
				new_node.leaf = true;
				new_node.label = child;
			}
			else {
				walk(child,new_node);
			}
		}
	}
	let new_root = {
		leaf : false,
		label : '',
		value : 0.0,
		parent : null,
		children : []
	};
	walk(newick_tree,new_root);
	add_information(new_root);
	return new_root;
}

// dress the tree up with some additional information
function add_information(root)
{
	let node_id = 0;
	let leaf_id = 0;

	walk_df(root, node => {

		// add depth value
		node.depth = node.parent === null ? 0 : node.parent.depth + 1;

		// add an absolute score value (cumulative back to the root)
		node.sum_value = node.parent === null ? 0 : node.parent.sum_value + node.value;

		// add IDs
		node.node_id = node_id++;
		if (node.leaf) node.leaf_id = leaf_id++;
	});
}

// print the tree to the console
function print_tree(tree) {
	walk_df(tree, node => {	if (node.leaf) console.log('.'.repeat( Math.round(node.sum_value*500) ) + node.label); });
}

// get the maximum score (eg, longest distance)
function get_max_score(tree) {
	let max = 0;
	walk_df(tree, node => {	if (!node.leaf && node.sum_value > max) max = node.sum_value; });
	return max;
}

// get the deepest layer
function get_max_depth(tree) {
	let max = 0;
	walk_df(tree, node => { if (!node.leaf && node.depth > max) max = node.depth; });
	return max;
}

// given a tree structure, set a cut point between 0 and 1 and break it into groups
function split(tree, cutoff)
{
	let groups = [];

	function walk(node)
	{
		if (node.leaf) {
			if (node.sum_value <= cutoff) {
				console.log('orphaned group, but added anyway: ' + node.label);
			}
			groups.push([node.label]);
		}
		else {
			if (node.sum_value <= cutoff) node.children.forEach(walk);
			else groups.push(get_leaves(node));
		}
	}
	walk(tree);
	return groups;
}

// given a tree, extract all the leaf values
function get_leaves(root) {
	let leaves = [];
	walk_df(root, (node) => { if (node.leaf) leaves.push(node.label); });
	return leaves;
}

// depth first traversal, applying a function to each node. The function takes breadth, depth and node as input
function walk_df(tree,func) {
	let stack = [tree];

	while (stack.length) {
		let node = stack.pop();
		func(node);
		if (node.children) {
			for (let i=node.children.length; i>0; --i) stack.push(node.children[i-1])
		}
	}
}

// breadth first traversal, applying a function to each node. The function takes breadth, depth and node as input
function walk_bf(tree,func) {
	let queue = [tree];

	while (queue.length) {
		let node = queue.shift();
		func(node);
		if (node.children) node.children.forEach( (child) => queue.push(child) );
	}
}


// get all nodes of a tree as an array (listed by depth first)
function to_array(tree) {
	let nodes = [];
	walk_df(tree,node => {
		nodes.push(node);
	});
	return nodes;
}

function test()
{
	// let tree = load_newick('./results.2.newick');
	//
	// console.log(JSON.stringify(tree, (k,v) => { return k == 'parent' ? '' : v; }, 2));
	// console.log(get_leaves(tree));
	//
	// for (let i=0.01; i<0.2; i+=0.01)
	// {
	// 	console.log(split(tree,i));
	// 	console.log('-'.repeat(100));
	// }
	//
	// console.log(deepest_score(tree));
	// console.log(deepest_layer(tree));
	// print_tree(tree);
	// console.log('done');

	let root = {
		val : 1, children : [{
			val : 2, children : [{
				val : 3, children : [{
					val : 4
				},{
					val : 5
				}]
			},{
				val : 6
			},{
				val : 7
			}]
		},{
			val : 8, children : [{
				val : 9
			},{
				val : 10, children : [{
					val : 11
				},{
					val : 12
				}]
			}]
		},{
			val : 13, children : [{
				val : 14
			},{
				val : 15
			}]
		}]
	};

	let btest = [];
	let dtest = [];

	walk_bf(root, (node) => btest.push(node.val));
	walk_df(root, (node) => dtest.push(node.val));

	console.assert(btest.join(',') == [1,2,8,13,3,6,7,9,10,14,15,4,5,11,12].join(','));
	console.assert(dtest.join(',') == [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].join(','));
}
if (require.main === module) test();

module.exports = { load_newick, print_tree, get_leaves, split, get_max_score, get_max_depth, walk_df, walk_bf };
