/*
# optomised PilbaraTree - Fabric.js version with performance improvements
# Original: Day 110: 2017-Apr-21 (Fri)
# optomised: 2025-Jun-30

Performance improvements:
- Chunked processing for large datasets
- Real-time progress reporting
- optomised canvas operations
- Better memory management
*/

// Main PilbaraTree namespace
window.PilbaraTree = new (function () {
	// Performance optimization: Check for Fabric.js availability
	if (typeof fabric === "undefined") {
		console.error("Fabric.js is required but not loaded");
		return null;
	}

	// Minimal events system (optomised)
	const EventsMixin = function (target) {
		if (target) return EventsMixin.call(target);

		// Use Map for better performance than object
		this.events = new Map();

		this.on = function (name, func) {
			if (!this.events.has(name)) this.events.set(name, []);
			if (typeof func === "function") this.events.get(name).push(func);
		};

		this.fire = function (name, data) {
			const handlers = this.events.get(name);
			if (handlers) handlers.forEach((f) => f(data));
		};
	};

	// optomised color map (truncated for performance)
	const colormap = [
		[255, 0, 0],
		[250, 12, 3],
		[240, 36, 9],
		[230, 60, 15],
		[220, 84, 21],
		[210, 108, 27],
		[200, 132, 33],
		[190, 156, 39],
		[180, 180, 45],
		[170, 204, 51],
		[160, 228, 57],
		[150, 252, 63],
		[140, 228, 69],
		[130, 204, 75],
		[120, 180, 81],
		[110, 156, 87],
		[100, 132, 93],
		[90, 108, 99],
		[80, 84, 105],
		[70, 60, 111],
		[60, 36, 117],
		[50, 12, 123],
		[40, 0, 129],
		[30, 24, 135],
		[20, 48, 141],
		[10, 72, 147],
		[0, 96, 153],
	];

	// optomised random color function
	function random_color() {
		const [r, g, b] = colormap[Math.floor(Math.random() * colormap.length)];
		return `rgb(${r},${g},${b})`;
	}

	// optomised tree traversal functions
	function walk_df(root, func) {
		const stack = [root];
		while (stack.length) {
			const node = stack.pop();
			func(node);
			if (node.children) {
				for (let i = node.children.length - 1; i >= 0; i--) {
					stack.push(node.children[i]);
				}
			}
		}
	}

	function walk_bf(root, func) {
		const queue = [root];
		while (queue.length) {
			const node = queue.shift();
			func(node);
			if (node.children) {
				queue.push(...node.children);
			}
		}
	}

	// optomised tree builder with better memory management
	function build_tree_from_table(table) {
		const nodes = new Array(table.length);
		let root = null;

		// First pass: create all nodes
		for (const [id, pid, leaf, distance, label] of table) {
			nodes[id] = {
				id,
				parent: pid,
				leaf: leaf === 1,
				distance,
				label: label || "",
				children: leaf === 1 ? null : [],
			};
		}

		// Second pass: connect relationships
		for (const node of nodes) {
			if (!node) continue;

			if (node.id === 0) {
				root = node;
				node.parent = null;
			} else {
				const parent = nodes[node.parent];
				if (parent) {
					node.parent = parent;
					if (parent.children) {
						parent.children.push(node);
					}
				}
			}
		}

		return root;
	}

	// Main Tree constructor (optomised for large datasets)
	function Tree(canvas, user_opts, data) {
		if (this.constructor !== Tree) return new Tree(canvas, user_opts, data);

		const self = this;
		EventsMixin(self);

		// Register event types
		[
			"node:collapse",
			"node:expand",
			"node:select",
			"node:unselect",
			"leaf:select",
			"leaf:unselect",
		].forEach((event) => self.on(event));

		// optomised default options
		const default_opts = {
			draw_mode: "fixed",
			branch_length: 15,
			leaf_font_family: "monospace",
			leaf_font_size: 10,
			leaf_padding: 1,
			leaf_color: "#000",
			leaf_highlight_color: "#90EE90",
			node_radius: 3,
			node_color: "#000",
			line_color: "#333",
			line_highlight_color: "#f00",
			line_thickness: 1,
			onProgress: null,
		};

		const opts = Object.assign(default_opts, user_opts || {});

		// Progress helper
		function reportProgress(percent, message, current, total) {
			if (opts.onProgress) {
				opts.onProgress(percent, message, current, total);
			}
		}

		// Initialize Fabric canvas with performance optimizations
		const fab = new fabric.Canvas(canvas, {
			renderOnAddRemove: false,
			skipTargetFind: false,
			perPixelTargetFind: false,
			enableRetinaScaling: false,
			imageSmoothingEnabled: false,
		});

		// Load data efficiently
		let root;
		if (data) {
			root = build_tree_from_table(data);
		} else if (window.treedata) {
			reportProgress(30, "Building tree structure...");
			root = build_tree_from_table(window.treedata);
		} else {
			console.error("No tree data available");
			return;
		}

		// Performance state variables
		let dirty = true;
		let leaf_height = 12;
		let leaf_left = 0;
		const leaves = [];
		const fabric_objects = [];

		// optomised Fabric objects builder with faster chunked processing
		function build_fabric_objects() {
			console.time("Building Fabric Objects");
			reportProgress(40, "Creating visual elements...");

			fab.renderOnAddRemove = false;

			const nodes_to_process = [];

			// Collect all nodes first
			walk_df(root, (node) => {
				nodes_to_process.push(node);
			});

			console.log(
				`Processing ${nodes_to_process.length} nodes in optomised chunks...`
			);
			reportProgress(
				42,
				"Starting node processing...",
				0,
				nodes_to_process.length
			);

			let processed = 0;
			// INCREASED chunk size dramatically for better performance
			const chunk_size = Math.min(
				500,
				Math.ceil(nodes_to_process.length / 10)
			);

			function processChunk() {
				const chunk_start = processed;
				const chunk_end = Math.min(
					processed + chunk_size,
					nodes_to_process.length
				);

				console.log(
					`Processing chunk ${chunk_start}-${chunk_end} (${chunk_size} nodes)`
				);

				// Process entire chunk synchronously for speed
				for (let i = chunk_start; i < chunk_end; i++) {
					const node = nodes_to_process[i];

					// Calculate depth and distance
					if (node.parent === null) {
						node.depth = 0;
						node.total_distance = 0;
					} else {
						node.depth = node.parent.depth + 1;
						node.total_distance =
							node.distance + node.parent.total_distance;
					}

					node.visible = true;
					node.selected = false;

					if (node.leaf) {
						// Create text object for leaf with minimal properties initially
						node.textbox = new fabric.Text(node.label, {
							fontFamily: opts.leaf_font_family,
							fontSize: opts.leaf_font_size,
							fill: opts.leaf_color,
							selectable: false,
							evented: true,
							hoverCursor: "pointer",
						});

						// Create line for leaf with minimal properties
						node.upline = new fabric.Line([0, 0, 0, 0], {
							stroke: opts.line_color,
							strokeWidth: opts.line_thickness,
							selectable: false,
							evented: false,
						});

						// Event handler for leaf
						node.textbox.on("mousedown", () => on_leaf_down(node));

						// Add to collections
						fabric_objects.push(node.textbox, node.upline);
						leaves.push(node);
					} else {
						// Create circle for internal node with minimal properties
						node.dot = new fabric.Circle({
							radius: opts.node_radius,
							fill: opts.node_color,
							selectable: false,
							evented: true,
							originX: "center",
							originY: "center",
							hoverCursor: "pointer",
						});

						// Create lines for internal node
						node.upline = new fabric.Line([0, 0, 0, 0], {
							stroke: opts.line_color,
							strokeWidth: opts.line_thickness,
							selectable: false,
							evented: false,
						});

						node.spanline = new fabric.Line([0, 0, 0, 0], {
							stroke: opts.line_color,
							strokeWidth: opts.line_thickness,
							selectable: false,
							evented: false,
						});

						// Event handlers for node
						node.dot.on("mouseover", () => on_node_over(node));
						node.dot.on("mouseout", () => on_node_out(node));
						node.dot.on("mousedown", () => on_node_down(node));

						// Add to collection
						fabric_objects.push(
							node.dot,
							node.upline,
							node.spanline
						);
					}
				}

				processed = chunk_end;
				const progress =
					42 + (processed / nodes_to_process.length) * 25; // 42-67%

				// Real-time progress with current/total counts
				reportProgress(
					progress,
					"Processing nodes",
					processed,
					nodes_to_process.length
				);

				if (processed < nodes_to_process.length) {
					// REDUCED timeout for faster processing
					setTimeout(processChunk, 1);
				} else {
					// Finished processing all nodes
					console.log(
						"Finished processing nodes, adding to canvas..."
					);
					finishBuilding();
				}
			}

			// Start chunk processing immediately
			processChunk();
		}

		function finishBuilding() {
			reportProgress(70, "Adding elements to canvas...");
			console.log(`Adding ${fabric_objects.length} objects to canvas...`);

			// Add objects in larger batches to reduce overhead
			let objectIndex = 0;
			const batchSize = Math.min(
				200,
				Math.ceil(fabric_objects.length / 5)
			);

			function addObjectBatch() {
				const batchEnd = Math.min(
					objectIndex + batchSize,
					fabric_objects.length
				);
				const batch = fabric_objects.slice(objectIndex, batchEnd);

				console.log(
					`Adding objects ${objectIndex} to ${batchEnd} (batch of ${batch.length})`
				);

				// Add all objects in batch at once
				fab.add(...batch);

				objectIndex = batchEnd;

				const progress =
					70 + (objectIndex / fabric_objects.length) * 15; // 70-85%
				reportProgress(
					progress,
					"Adding elements to canvas",
					objectIndex,
					fabric_objects.length
				);

				if (objectIndex < fabric_objects.length) {
					// Minimal timeout for UI responsiveness
					setTimeout(addObjectBatch, 1);
				} else {
					finalizeTree();
				}
			}

			addObjectBatch();
		}

		function finalizeTree() {
			reportProgress(85, "Calculating dimensions...");

			// Calculate dimensions with extra padding
			const w = calculate_width();
			const h = calculate_height();

			console.log(`Tree dimensions: ${w} x ${h}`);

			reportProgress(90, "Final positioning...");

			dirty = true; // Ensure recompute runs
			recompute();
			resize(w, h);

			console.timeEnd("Building Fabric Objects");
			reportProgress(100, "Tree complete!");

			// Notify completion
			if (window.onTreeComplete) {
				setTimeout(window.onTreeComplete, 50);
			}
		}

		// optomised width calculation with proper padding
		function calculate_width() {
			let max_label_width = 0;
			let max_depth = 0;

			for (const leaf of leaves) {
				if (leaf.depth > max_depth) max_depth = leaf.depth;
				// Use calculated width or reasonable default
				const width =
					leaf.textbox.width ||
					leaf.label.length * opts.leaf_font_size * 0.6;
				if (width > max_label_width) max_label_width = width;
			}

			leaf_left = max_depth * opts.branch_length + 50;
			const total_width = leaf_left + max_label_width + 150;
			console.log(
				`Width calculation: max_depth=${max_depth}, max_label_width=${max_label_width}, total_width=${total_width}`
			);
			return total_width;
		}

		// optomised height calculation with proper padding
		function calculate_height() {
			const totalHeight = leaves.length * leaf_height + 200;
			console.log(
				`Height calculation: ${leaves.length} leaves × ${leaf_height}px + padding = ${totalHeight}px`
			);
			return Math.max(totalHeight, 600);
		}

		// optomised canvas resize with proper bounds
		function resize(w, h) {
			console.log(`Resizing canvas to: ${w} x ${h}`);

			const final_w = Math.max(w, 1000);
			const final_h = Math.max(h, 1000);

			fab.setDimensions({
				width: Math.round(final_w),
				height: Math.round(final_h),
			});

			// Update the canvas element attributes to match
			const canvas = fab.getElement();
			canvas.width = Math.round(final_w);
			canvas.height = Math.round(final_h);

			// Update the wrapper's scroll area
			const wrapper = document.getElementById("tree_wrapper");
			if (wrapper) {
				wrapper.style.minHeight = Math.round(final_h) + "px";
				wrapper.style.minWidth = Math.round(final_w) + "px";
			}

			fab.renderAll();
			console.log(`Canvas resized to: ${final_w} x ${final_h}`);
		}

		// Event handlers (optomised)
		function on_leaf_down(leaf) {
			leaf.selected = !leaf.selected;

			if (leaf.selected) {
				leaf.textbox.set("backgroundColor", opts.leaf_highlight_color);
				self.fire("leaf:select", leaf);
			} else {
				leaf.textbox.set("backgroundColor", "");
				self.fire("leaf:unselect", leaf);
			}

			fab.renderAll();
		}

		function on_node_over(node) {
			node.dot.set("radius", node.dot.radius + 2);
			fab.renderAll();
		}

		function on_node_out(node) {
			node.dot.set("radius", node.dot.radius - 2);
			fab.renderAll();
		}

		// optomised double-click detection
		let click_timer = null;
		function on_node_down(node) {
			if (click_timer) {
				clearTimeout(click_timer);
				click_timer = null;
				set_subtree_visibility(node, true);
				self.fire("node:expand", node);
			} else {
				click_timer = setTimeout(() => {
					click_timer = null;
					node.selected = !node.selected;

					const color = node.selected
						? opts.line_highlight_color
						: opts.line_color;
					set_subtree_color(node, color);

					if (node.selected) {
						self.fire("node:select", node);
					} else {
						self.fire("node:unselect", node);
					}
				}, 200);
			}
		}

		// optomised rendering
		function render() {
			if (dirty) {
				recompute();
				fab.renderAll();
				dirty = false;
			}
		}

		// optomised position computation with proper spacing
		function recompute() {
			console.log("Recomputing positions...");

			const visible_leaves = leaves.filter((leaf) => leaf.visible);
			const visible_nodes = [];

			walk_bf(root, (node) => {
				if (!node.leaf && node.visible) visible_nodes.push(node);
			});

			console.log(
				`Positioning ${visible_leaves.length} leaves and ${visible_nodes.length} nodes`
			);

			if (opts.draw_mode === "fixed") {
				const half_height = leaf_height / 2;
				const top_padding = 50;
				const left_padding = 20;

				// Position leaves with padding
				for (let i = 0; i < visible_leaves.length; i++) {
					const leaf = visible_leaves[i];
					const x1 =
						(leaf.depth - 1) * opts.branch_length + left_padding;
					const x2 = leaf_left + left_padding;
					const y1 = i * leaf_height + top_padding;

					leaf.textbox.set({ left: x2, top: y1 });
					leaf.upline.set({
						x1,
						x2,
						y1: y1 + half_height,
						y2: y1 + half_height,
					});
					leaf.textbox.setCoords();
				}

				// Position internal nodes with padding
				for (const node of visible_nodes.reverse()) {
					if (node.children && node.children.length > 0) {
						const visible_children = node.children.filter(
							(c) => c.visible
						);
						if (visible_children.length > 0) {
							const x1 = node.parent
								? node.parent.depth * opts.branch_length +
								  left_padding
								: left_padding;
							const x2 =
								node.depth * opts.branch_length + left_padding;
							const y1 = visible_children[0].upline
								? visible_children[0].upline.y1
								: top_padding;
							const y2 = visible_children[
								visible_children.length - 1
							].upline
								? visible_children[visible_children.length - 1]
										.upline.y1
								: y1;
							const ymid = (y1 + y2) / 2;

							node.upline.set({ x1, x2, y1: ymid, y2: ymid });
							node.spanline.set({ x1: x2, x2, y1, y2 });
							node.dot.set({ left: x2, top: ymid });
							node.dot.setCoords();
						}
					}
				}
			}

			console.log("Position computation complete");
		}

		// optomised color setting with batching
		function set_subtree_color(start_node, color) {
			const objects_to_update = [];

			walk_df(start_node, (node) => {
				if (node.leaf) {
					objects_to_update.push(
						{ obj: node.upline, props: { stroke: color } },
						{ obj: node.textbox, props: { fill: color } }
					);
				} else {
					objects_to_update.push(
						{ obj: node.upline, props: { stroke: color } },
						{ obj: node.spanline, props: { stroke: color } },
						{ obj: node.dot, props: { fill: color } }
					);
				}
			});

			// Batch update all objects
			for (const { obj, props } of objects_to_update) {
				if (obj) obj.set(props);
			}

			fab.renderAll();
		}

		// optomised visibility toggling
		function set_subtree_visibility(node, state) {
			const objects_to_update = [];

			walk_df(node, (n) => {
				if (n.visible === state) return;
				n.visible = state;

				if (n.textbox)
					objects_to_update.push({ obj: n.textbox, visible: state });
				if (n.dot && n !== node)
					objects_to_update.push({ obj: n.dot, visible: state });
				if (n.upline && n !== node)
					objects_to_update.push({ obj: n.upline, visible: state });
				if (n.spanline)
					objects_to_update.push({ obj: n.spanline, visible: state });
			});

			// Batch update visibility
			for (const { obj, visible } of objects_to_update) {
				if (obj) obj.set({ visible });
			}

			dirty = true;
			render();
		}

		// Public API
		this.render = render;
		this.expand_all = () => set_subtree_visibility(root, true);
		this.collapse_all = () => set_subtree_visibility(root, false);

		// Initialize the tree
		build_fabric_objects();
	}

	// Return the Tree constructor
	return Tree;
})();
