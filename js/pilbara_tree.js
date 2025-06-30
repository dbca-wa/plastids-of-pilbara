/*

# Day 82: 2017-Mar-24 (Fri): created
# Day 110: 2017-Apr-21 (Fri): new version

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

// contain in a single namespace
window.PilbaraTree = new function()
{
	// include the fabric.js library
	if (!fabric)
	{
		let script = document.createElement('script');
		script.src = 'fabric.min.js';
		document.head.appendChild(script);
	}

	// really minimal events support
	const EventsMixin = function(target)
	{
		if (target) return EventsMixin.call(target);
		['events','on','fire'].forEach( e => console.assert(this[e] === undefined));
		this.events = {};
		this.on = function(name,func) {
			if (!this.events[name]) this.events[name] = [];
			if (typeof func == 'function') this.events[name].push(func);
		}
		this.fire = function(name,data) {
			this.events[name].forEach(f => f(data));
		}
	}

	// colour map generated online at: http://jdherman.github.io/colormap/
	const colormap = [
		[255,0,0],[253,4,1],[252,8,2],[250,12,3],[248,16,4],[247,20,5],[245,24,6],[244,28,7],
		[242,32,8],[240,36,9],[239,40,10],[237,44,11],[235,48,12],[234,52,13],[232,56,14],[230,60,15],[229,64,16],
		[227,68,17],[226,72,18],[224,76,19],[222,80,20],[221,84,21],[219,88,22],[217,92,23],[216,96,24],[214,100,25],
		[212,104,26],[211,108,27],[209,112,27],[208,116,28],[206,120,29],[204,124,30],[203,128,31],[201,132,32],
		[199,136,33],[198,140,34],[196,144,35],[194,148,36],[193,152,37],[191,156,38],[190,160,39],[188,164,40],
		[186,169,41],[185,173,42],[183,177,43],[181,181,44],[180,185,45],[178,189,46],[176,193,47],[175,197,48],
		[173,201,49],[172,205,50],[170,209,51],[168,213,52],[167,217,53],[165,221,54],[163,225,55],[162,229,56],
		[160,233,57],[158,237,58],[157,241,59],[155,245,60],[154,249,61],[152,253,62],[151,255,63],[152,251,64],
		[153,247,65],[154,243,66],[155,239,67],[156,235,68],[156,231,69],[157,227,70],[158,223,71],[159,219,72],
		[160,215,73],[161,211,74],[162,207,76],[163,203,77],[164,199,78],[165,195,79],[166,191,80],[167,187,81],
		[167,183,82],[168,179,83],[169,175,84],[170,171,85],[171,167,86],[172,162,87],[173,158,88],[174,154,89],
		[175,150,90],[176,146,91],[177,142,92],[178,138,93],[179,134,94],[179,130,96],[180,126,97],[181,122,98],
		[182,118,99],[183,114,100],[184,110,101],[185,106,102],[186,102,103],[187,98,104],[188,94,105],[189,90,106],
		[190,86,107],[191,82,108],[191,78,109],[192,74,110],[193,70,111],[194,66,112],[195,62,113],[196,58,115],
		[197,54,116],[198,50,117],[199,46,118],[200,42,119],[201,38,120],[202,34,121],[203,30,122],[203,26,123],
		[204,22,124],[205,18,125],[206,14,126],[207,10,127],[208,6,128],[209,2,129],[208,2,130],[206,6,131],
		[204,10,132],[202,14,133],[200,18,134],[197,22,135],[195,26,136],[193,30,137],[191,34,138],[189,38,139],
		[187,42,141],[184,46,142],[182,50,143],[180,54,144],[178,58,145],[176,62,146],[173,66,147],[171,70,148],
		[169,74,149],[167,78,150],[165,82,151],[163,86,152],[160,90,153],[158,94,154],[156,98,155],[154,102,156],
		[152,106,157],[149,110,158],[147,114,159],[145,118,160],[143,122,161],[141,126,162],[139,130,163],
		[136,134,164],[134,138,165],[132,142,166],[130,146,167],[128,150,168],[125,154,169],[123,158,170],
		[121,162,171],[119,167,172],[117,171,173],[115,175,174],[112,179,175],[110,183,176],[108,187,177],
		[106,191,178],[104,195,179],[101,199,180],[99,203,181],[97,207,182],[95,211,183],[93,215,184],[90,219,185],
		[88,223,186],[86,227,187],[84,231,188],[82,235,189],[80,239,190],[77,243,191],[75,247,192],[73,251,193],
		[71,255,194],[69,253,195],[68,249,196],[67,245,197],[66,241,198],[65,237,199],[64,233,200],[63,229,201],
		[62,225,202],[61,221,203],[60,217,204],[58,213,205],[57,209,206],[56,205,207],[55,201,208],[54,197,209],
		[53,193,210],[52,189,211],[51,185,212],[50,181,213],[49,177,214],[47,173,215],[46,169,216],[45,164,217],
		[44,160,217],[43,156,218],[42,152,219],[41,148,220],[40,144,221],[39,140,222],[38,136,223],[36,132,224],
		[35,128,225],[34,124,226],[33,120,227],[32,116,228],[31,112,229],[30,108,230],[29,104,231],[28,100,232],
		[26,96,233],[25,92,234],[24,88,235],[23,84,236],[22,80,237],[21,76,238],[20,72,239],[19,68,239],[18,64,240],
		[17,60,241],[15,56,242],[14,52,243],[13,48,244],[12,44,245],[11,40,246],[10,36,247],[9,32,248],[8,28,249],
		[7,24,250],[6,20,251],[4,16,252],[3,12,253],[2,8,254],[1,4,255],[0,0,255]
	];

	// choose a random colour from the colour map
	function random_color() {
		let [r,g,b] = colormap[Math.floor(Math.random() * (colormap.length-1))];
		return `rgb(${r},${g},${b})`;
	}

	// depth first traversal, applying a function to each node (does not check for cycles)
	function walk_df(root,func) {
		let stack = [root];
		while (stack.length) {
			let node = stack.pop();
			func(node);
			if (node.children) {
				for (let i=node.children.length; i>0; --i) stack.push(node.children[i-1]);
			}
		}
	}

	// breadth first traversal, applying a function to each node (does not check for cycles)
	function walk_bf(root,func) {
		let queue = [root];
		while (queue.length) {
			let node = queue.shift();
			func(node);
			if (node.children) node.children.forEach( (child) => queue.push(child) );
		}
	}

	// data for the tree. This should be included from a remote source later
	// nodeID, parentID, isLeaf, distance_from_parent, label
	let treedata = [
		[0,null,0,0,""],
		[1,0,0,0.00228765,""],
		[2,1,1,0.045351,">Asteraceae;_Bidens_sp._[uwaid:33780]_[length:126923]"],
		[3,1,0,0.015925,""],
		[4,3,0,0.013757,""],
		[5,4,0,0.0022676,""],
		[6,5,0,0.0016881,""],
		[7,6,0,0.0036064,""],
		[8,7,0,0.0014532,""],
		[9,8,0,0.0017834,""],
		[10,9,1,0.00082058,">Cyperaceae;_Fimbristylis_dichotoma_[uwaid:33658]_[length:107909]"],
		[11,9,1,0.0062709,">Cyperaceae;_Bulbostylis_turbinata_[uwaid:22308]_[length:118050]"],
		[12,8,1,0.003227,">Amaranthaceae;_Ptilotus_murrayi_[uwaid:22351]_[length:138344]"],
		[13,7,1,0.0044923,">Cyperaceae;_Bulbostylis_barbata_[uwaid:22402]_[length:156701]"],
		[14,6,0,0.0058831,""],
		[15,14,0,0.0057705,""],
		[16,15,1,0.0016339,">Cyperaceae;_Fimbristylis_dichotoma_[uwaid:33675]_[length:121404]"],
		[17,15,1,0.00048725,">Cyperaceae;_Fimbristylis_dichotoma_[uwaid:22316]_[length:94132]"],
		[18,14,0,0.0059086,""],
		[19,18,1,0.0032419,">Cyperaceae;_Fimbristylis_simulans_[uwaid:22507]_[length:72357]"],
		[20,18,1,0.00056018,">Cyperaceae;_Fimbristylis_simulans_[uwaid:22315]_[length:84004]"],
		[21,5,0,0.012696,""],
		[22,21,1,0.0070278,">Cyperaceae;_Eleocharis_geniculata_[uwaid:22536]_[length:78467]"],
		[23,21,1,0.015864,">Cyperaceae;_Eleocharis_papillosa_[uwaid:22513]_[length:90832]"],
		[24,4,0,0.0092714,""],
		[25,24,0,0.0012211,""],
		[26,25,0,0.0013631,""],
		[27,26,0,0.0006739,""],
		[28,27,0,0.0004264,""],
		[29,28,0,0.00053899,""],
		[30,29,0,0.0025764,""],
		[31,30,0,0.00038661,""],
		[32,31,1,0.0095063,">Cyperaceae;_Cyperus_cunninghamii_subsp._cunninghamii_[uwaid:33666]_[length:76378]"],
		[33,31,1,0.0035229,">Cyperaceae;_Cyperus_vaginatus_[uwaid:22309]_[length:118598]"],
		[34,30,1,0,">Cyperaceae;_Cyperus_vaginatus_[uwaid:33638]_[length:156248]"],
		[35,29,1,0,">Cyperaceae;_Cyperus_blakeanus_[uwaid:22310]_[length:157515]"],
		[36,28,1,0.00054499,">Cyperaceae;_Cyperus_hesperius_[uwaid:22545]_[length:124479]"],
		[37,27,1,0.00090855,">Cyperaceae;_Cyperus_ixiocarpus_[uwaid:22512]_[length:119241]"],
		[38,26,1,0.0016336,">Cyperaceae;_Cyperus_squarrosus_[uwaid:22312]_[length:134995]"],
		[39,25,1,0.0033724,">Cyperaceae;_Cyperus_pulchellus_[uwaid:22311]_[length:148107]"],
		[40,24,1,0.0050631,">Cyperaceae;_Cyperus_difformis_[uwaid:33682]_[length:134714]"],
		[41,3,0,0.0057936,""],
		[42,41,0,0.018379,""],
		[43,42,0,0.00062379,""],
		[44,43,0,0.00022376,""],
		[45,44,0,0.00032332,""],
		[46,45,0,0.0048839,""],
		[47,46,0,0.00010824,""],
		[48,47,0,0.00032009,""],
		[49,48,0,0.00045533,""],
		[50,49,0,0.00032951,""],
		[51,50,1,0.000020246,">Poaceae;_Aristida_inaequiglumis_[uwaid:22414]_[length:137474]"],
		[52,50,1,0.000030971,">Poaceae;_Aristida_pruinosa_[uwaid:22322]_[length:137353]"],
		[53,49,0,0.00034248,""],
		[54,53,1,0.000018226,">Poaceae;_Aristida_jerichoensis_var._subspinulifera_[uwaid:33748]_[length:134031]"],
		[55,53,1,0.000020278,">Poaceae;_Aristida_jerichoensis_var._subspinulifera_[uwaid:22439]_[length:133968]"],
		[56,48,1,0.00059721,">Boraginaceae;_Heliotropium_cunninghamii_[uwaid:33575]_[length:137457]"],
		[57,47,0,0.00074124,""],
		[58,57,0,0.00020596,""],
		[59,58,1,0.000018166,">Poaceae;_Aristida_latifolia_[uwaid:33699]_[length:137499]"],
		[60,58,1,0.000017026,">Poaceae;_Aristida_latifolia_[uwaid:33535]_[length:137474]"],
		[61,57,1,0.0002218,">Poaceae;_Aristida_inaequiglumis_[uwaid:33721]_[length:137489]"],
		[62,46,0,0.00022894,""],
		[63,62,0,0.00084119,""],
		[64,63,0,0.000012034,""],
		[65,64,1,0.000078032,">Poaceae;_Aristida_holathera_var._holathera_[uwaid:33711]_[length:132131]"],
		[66,64,1,0.000074113,">Poaceae;_Aristida_holathera_var._holathera_[uwaid:22401]_[length:132282]"],
		[67,63,1,0.000085988,">Poaceae;_Aristida_holathera_var._holathera_[uwaid:22437]_[length:132339]"],
		[68,62,0,0.00086226,""],
		[69,68,1,0.000056672,">Poaceae;_Aristida_contorta_[uwaid:33692]_[length:132852]"],
		[70,68,1,0.000058795,">Poaceae;_Aristida_contorta_[uwaid:22438]_[length:132942]"],
		[71,45,1,0.0058488,">Poaceae;_Elytrophorus_spicatus_[uwaid:33760]_[length:136331]"],
		[72,44,0,0.0014899,""],
		[73,72,0,0.00072193,""],
		[74,73,0,0.00025554,""],
		[75,74,0,0.0001036,""],
		[76,75,0,0.00031282,""],
		[77,76,0,0.000010599,""],
		[78,77,0,0.0012626,""],
		[79,78,0,0.00034693,""],
		[80,79,0,0.000074666,""],
		[81,80,0,0.00029989,""],
		[82,81,0,0.00046359,""],
		[83,82,0,0.00015634,""],
		[84,83,0,0.00018192,""],
		[85,84,0,0.00047329,""],
		[86,85,1,0.000072009,">Poaceae;_Paspalidium_clementii_[uwaid:33717]_[length:138849]"],
		[87,85,1,0.000077917,">Poaceae;_Paspalidium_clementii_[uwaid:22493]_[length:139016]"],
		[88,84,1,0.000603,">Poaceae;_Paspalidium_tabulatum_[uwaid:22300]_[length:138909]"],
		[89,83,0,0.00088561,""],
		[90,89,0,0.000002965,""],
		[91,90,0,0.0000027942,""],
		[92,91,1,0.000035989,">Poaceae;_Setaria_verticillata_[uwaid:22398]_[length:139309]"],
		[93,91,1,0.000016204,">Poaceae;_Setaria_dielsii_[uwaid:22326]_[length:138796]"],
		[94,90,1,0.000027117,">Poaceae;_Setaria_dielsii_[uwaid:33762]_[length:138841]"],
		[95,89,1,0.000026796,">Poaceae;_Setaria_verticillata_[uwaid:33732]_[length:138770]"],
		[96,82,0,0.00091737,""],
		[97,96,1,0,">Poaceae;_Paspalidium_rarum_[uwaid:33756]_[length:139100]"],
		[98,96,1,0.000021342,">Poaceae;_Paspalidium_rarum_[uwaid:22484]_[length:139332]"],
		[99,81,0,0.0015749,""],
		[100,99,1,0.000045279,">Poaceae;_Paspalidium_retiglume_[uwaid:33609]_[length:137680]"],
		[101,99,1,0.000048989,">Poaceae;_Paspalidium_retiglume_[uwaid:22415]_[length:138007]"],
		[102,80,1,0.00175,">Poaceae;_Whiteochloa_cymbiformis_[uwaid:22515]_[length:138479]"],
		[103,79,0,0.0015623,""],
		[104,103,1,0.00044618,">Poaceae;_Xerochloa_barbata_[uwaid:33811]_[length:137986]"],
		[105,103,1,0.00057566,">Poaceae;_Xerochloa_barbata_[uwaid:33742]_[length:139922]"],
		[106,78,0,0.0020435,""],
		[107,106,1,0.00041487,">Poaceae;_Cenchrus_setiger_[uwaid:33759]_[length:137029]"],
		[108,106,1,0.00048257,">Poaceae;_Cenchrus_ciliaris_[uwaid:33731]_[length:137291]"],
		[109,77,0,0.0024952,""],
		[110,109,0,0.00040408,""],
		[111,110,0,0.00057926,""],
		[112,111,1,0.000053605,">Poaceae;_Yakirra_australiensis_[uwaid:33814]_[length:139673]"],
		[113,111,1,0.00019595,">Poaceae;_Yakirra_australiensis_var._australiensis_[uwaid:33698]_[length:142072]"],
		[114,110,0,0.0006011,""],
		[115,114,1,0.000024303,">Poaceae;_Panicum_effusum_[uwaid:33755]_[length:135437]"],
		[116,114,1,0.000023569,">Poaceae;_Panicum_effusum_[uwaid:22445]_[length:135402]"],
		[117,109,0,0.00088635,""],
		[118,117,0,0.000043836,""],
		[119,118,1,0.000085874,">Poaceae;_Panicum_decompositum_[uwaid:33769]_[length:139163]"],
		[120,118,1,0.000097329,">Poaceae;_Panicum_decompositum_[uwaid:22444]_[length:139155]"],
		[121,117,1,0.00014402,">Poaceae;_Panicum_laevinode_[uwaid:33707]_[length:139158]"],
		[122,76,0,0.0014643,""],
		[123,122,0,0.00013439,""],
		[124,123,1,0.0020905,">Poaceae;_Urochloa_pubigera_[uwaid:22446]_[length:140192]"],
		[125,123,1,0.0017487,">Poaceae;_Urochloa_piligera_[uwaid:22323]_[length:140631]"],
		[126,122,1,0.001921,">Poaceae;_Urochloa_holosericea_subsp._velutina_[uwaid:22443]_[length:139967]"],
		[127,75,1,0.0039387,">Poaceae;_Echinochloa_colona_[uwaid:33767]_[length:139592]"],
		[128,74,0,0.0039347,""],
		[129,128,0,0.000035431,""],
		[130,129,1,0.000058453,">Poaceae;_not_assigned_sp._[uwaid:33765]_[length:140738]"],
		[131,129,1,0.000058215,">Poaceae;_Paraneurachne_muelleri_[uwaid:22518]_[length:140709]"],
		[132,128,1,0.000088878,">Poaceae;_Paraneurachne_muelleri_[uwaid:33694]_[length:140606]"],
		[133,73,0,0.0031074,""],
		[134,133,0,0.0011229,""],
		[135,134,1,0.000047998,">Poaceae;_Digitaria_brownii_[uwaid:33750]_[length:139162]"],
		[136,134,1,0.000046877,">Poaceae;_Digitaria_brownii_[uwaid:22295]_[length:139212]"],
		[137,133,1,0.0010904,">Poaceae;_Digitaria_ctenantha_[uwaid:22297]_[length:138862]"],
		[138,72,0,0.0025569,""],
		[139,138,0,0.00035378,""],
		[140,139,0,0.00019795,""],
		[141,140,0,0.00011184,""],
		[142,141,0,0.00027131,""],
		[143,142,0,0.00016174,""],
		[144,143,0,0.000077984,""],
		[145,144,0,0.00059816,""],
		[146,145,0,0.000080607,""],
		[147,146,0,0.00031188,""],
		[148,147,1,0.00010095,">Poaceae;_Eulalia_aurea_[uwaid:33758]_[length:140704]"],
		[149,147,1,0.000017762,">Poaceae;_not_assigned_sterile_[uwaid:33708]_[length:138392]"],
		[150,146,1,0.00034233,">Poaceae;_Dichanthium_sericeum_subsp._humilius_[uwaid:33713]_[length:138380]"],
		[151,145,0,0.00017756,""],
		[152,151,0,0.00011618,""],
		[153,152,0,0.000094871,""],
		[154,153,0,0.000033801,""],
		[155,154,1,0.000014415,">Poaceae;_Enneapogon_sp._[uwaid:33728]_[length:138064]"],
		[156,154,1,0.00001101,">Poaceae;_Enneapogon_lindleyanus_[uwaid:33703]_[length:137938]"],
		[157,153,1,0.000046057,">Poaceae;_Dichanthium_sericeum_subsp._humilius_[uwaid:22296]_[length:137938]"],
		[158,152,1,0.00013674,">Poaceae;_Dichanthium_sericeum_subsp._polystachyum_[uwaid:33733]_[length:138017]"],
		[159,151,1,0.00027047,">Poaceae;_Bothriochloa_bladhii_subsp._bladhii_[uwaid:22263]_[length:138340]"],
		[160,144,0,0.0011325,""],
		[161,160,0,0.000034571,""],
		[162,161,0,0.000019723,""],
		[163,162,0,0.00012604,""],
		[164,163,0,0.000064377,""],
		[165,164,1,0.0000085779,">Poaceae;_Iseilema_dolichotrichum_[uwaid:33468]_[length:139659]"],
		[166,164,1,0.0000077881,">Poaceae;_Iseilema_dolichotrichum_[uwaid:22508]_[length:139638]"],
		[167,163,1,0.000069503,">Poaceae;_Iseilema_membranaceum_[uwaid:22541]_[length:139676]"],
		[168,162,0,0.00017902,""],
		[169,168,1,0.000032278,">Poaceae;_Iseilema_dolichotrichum_[uwaid:33730]_[length:139668]"],
		[170,168,1,0.000031007,">Poaceae;_Iseilema_dolichotrichum_[uwaid:22306]_[length:139668]"],
		[171,161,1,0.00029418,">Poaceae;_Iseilema_membranaceum_[uwaid:33705]_[length:139815]"],
		[172,160,0,0.00018136,""],
		[173,172,0,0.000068327,""],
		[174,173,1,0.00001333,">Poaceae;_Iseilema_vaginiflorum_[uwaid:33706]_[length:139603]"],
		[175,173,1,0.000013341,">Poaceae;_Iseilema_vaginiflorum_[uwaid:22328]_[length:139603]"],
		[176,172,1,0.00008176,">Poaceae;_Iseilema_macratherum_[uwaid:33606]_[length:139646]"],
		[177,143,0,0.0011199,""],
		[178,177,0,0.000038474,""],
		[179,178,1,0.000035379,">Poaceae;_Cymbopogon_obtectus_[uwaid:33722]_[length:139792]"],
		[180,178,1,0.000034437,">Poaceae;_Cymbopogon_obtectus_[uwaid:22260]_[length:140012]"],
		[181,177,1,0.000067356,">Poaceae;_Cymbopogon_ambiguus_[uwaid:22261]_[length:139691]"],
		[182,142,0,0.0012259,""],
		[183,182,0,0.0000056829,""],
		[184,183,0,0.000014585,""],
		[185,184,0,0.0000040844,""],
		[186,185,1,0.00013119,">Poaceae;_Setaria_surgens_[uwaid:33810]_[length:139051]"],
		[187,185,1,0.0001183,">Poaceae;_Themeda_sp._Hamersley_Station_[uwaid:22440]_[length:139005]"],
		[188,184,1,0.00010744,">Poaceae;_Themeda_triandra_[uwaid:33813]_[length:138918]"],
		[189,183,1,0.00011824,">Poaceae;_Themeda_triandra_[uwaid:33714]_[length:138985]"],
		[190,182,0,0.000085479,""],
		[191,190,0,0.000079319,""],
		[192,191,1,0,">Poaceae;_Themeda_triandra_[uwaid:33747]_[length:138923]"],
		[193,191,1,0.00046393,">Poaceae;_Themeda_sp._Mt_Barricade_[uwaid:22301]_[length:129929]"],
		[194,190,1,0.000053,">Poaceae;_Themeda_triandra_[uwaid:33744]_[length:138897]"],
		[195,141,1,0.0016524,">Poaceae;_Schizachyrium_fragile_[uwaid:33605]_[length:139275]"],
		[196,140,0,0.00018588,""],
		[197,196,0,0.0016802,""],
		[198,197,1,0.000052632,">Poaceae;_Eulalia_aurea_[uwaid:33716]_[length:140235]"],
		[199,197,1,0.000045248,">Poaceae;_Eulalia_aurea_[uwaid:22529]_[length:140352]"],
		[200,196,1,0.0016002,">Poaceae;_Sorghum_plumosum_[uwaid:33808]_[length:140679]"],
		[201,139,0,0.0018473,""],
		[202,201,1,0.00021084,">Poaceae;_Chrysopogon_fallax_[uwaid:33726]_[length:140675]"],
		[203,201,1,0.00031178,">Poaceae;_Chrysopogon_fallax_[uwaid:22299]_[length:131626]"],
		[204,138,1,0.0019181,">Poaceae;_Mnesithea_formosa_[uwaid:22450]_[length:137472]"],
		[205,43,0,0.0015645,""],
		[206,205,0,0.00020696,""],
		[207,206,0,0.00018564,""],
		[208,207,0,0.00046377,""],
		[209,208,0,0.00020161,""],
		[210,209,0,0.00058494,""],
		[211,210,0,0.00032585,""],
		[212,211,0,0.0001952,""],
		[213,212,0,0.00099503,""],
		[214,213,0,0.00024905,""],
		[215,214,0,0.00055496,""],
		[216,215,0,0.00025848,""],
		[217,216,0,0.0015521,""],
		[218,217,0,0.000024974,""],
		[219,218,1,0,">Poaceae;_Enteropogon_ramosus_[uwaid:33738]_[length:132609]"],
		[220,218,1,0.0024854,">Poaceae;_Chloris_pumilio_[uwaid:22265]_[length:133844]"],
		[221,217,1,0,">Poaceae;_Enteropogon_ramosus_[uwaid:22307]_[length:132690]"],
		[222,216,0,0.0059692,""],
		[223,222,0,0.0000047215,""],
		[224,223,1,0,">Poaceae;_Diplachne_fusca_subsp._fusca_[uwaid:33537]_[length:135544]"],
		[225,223,1,0.0010764,">Poaceae;_Eriachne_obtusa_[uwaid:33536]_[length:176570]"],
		[226,222,1,0,">Poaceae;_Eriachne_ciliata_[uwaid:33538]_[length:134658]"],
		[227,215,0,0.0011618,""],
		[228,227,0,0.00027412,""],
		[229,228,0,0.00010197,""],
		[230,229,1,0.000066216,">Poaceae;_not_assigned_sterile_[uwaid:33736]_[length:135850]"],
		[231,229,1,0.000059068,">Poaceae;_Astrebla_pectinata_[uwaid:33701]_[length:135810]"],
		[232,228,1,0.00014107,">Poaceae;_Astrebla_lappacea_[uwaid:22451]_[length:135801]"],
		[233,227,1,0.00042232,">Poaceae;_Astrebla_elymoides_[uwaid:33700]_[length:135712]"],
		[234,214,0,0.0022636,""],
		[235,234,1,0.000042084,">Poaceae;_Chloris_pectinata_[uwaid:33768]_[length:135607]"],
		[236,234,1,0.000041398,">Poaceae;_Chloris_pectinata_[uwaid:22264]_[length:135625]"],
		[237,213,0,0.0016811,""],
		[238,237,0,0.000205,""],
		[239,238,0,0.00062319,""],
		[240,239,1,0.00010508,">Poaceae;_Brachyachne_convergens_[uwaid:33725]_[length:134263]"],
		[241,239,1,0.000088089,">Poaceae;_Cynodon_convergens_[uwaid:22262]_[length:134264]"],
		[242,238,0,0.00077448,""],
		[243,242,1,0.000012246,">Poaceae;_Brachyachne_prostrata_[uwaid:33737]_[length:134375]"],
		[244,242,1,0.0000042891,">Chenopodiaceae;_Maireana_melanocoma_[uwaid:33641]_[length:134311]"],
		[245,237,1,0.00087236,">Poaceae;_Cynodon_dactylon_[uwaid:33710]_[length:134350]"],
		[246,212,0,0.0018199,""],
		[247,246,0,0.00021237,""],
		[248,247,0,0.0001097,""],
		[249,248,0,0.00023795,""],
		[250,249,0,0.000049806,""],
		[251,250,0,0.0003366,""],
		[252,251,0,0.000010035,""],
		[253,252,0,0.000048665,""],
		[254,253,1,0.00015859,">Poaceae;_Triodia_wiseana_[uwaid:33709]_[length:135165]"],
		[255,253,1,0.00016931,">Poaceae;_Triodia_angusta_[uwaid:22342]_[length:135147]"],
		[256,252,1,0.00021048,">Poaceae;_Triodia_brizoides_[uwaid:22346]_[length:135148]"],
		[257,251,0,0.000051765,""],
		[258,257,1,0.00017908,">Poaceae;_Triodia_sp._[uwaid:33695]_[length:135125]"],
		[259,257,1,0.00017086,">Poaceae;_Triodia_wiseana_[uwaid:22349]_[length:135031]"],
		[260,250,1,0.00054233,">Poaceae;_Triodia_secunda_[uwaid:22347]_[length:135048]"],
		[261,249,0,0.00051653,""],
		[262,261,0,0.00002039,""],
		[263,262,1,0.000031473,">Poaceae;_Triodia_brizoides_[uwaid:33740]_[length:135061]"],
		[264,262,1,0.000050893,">Poaceae;_Triodia_brizoides_[uwaid:33719]_[length:135000]"],
		[265,261,1,0.000057404,">Poaceae;_Triodia_sp._[uwaid:33696]_[length:135134]"],
		[266,248,0,0.00056815,""],
		[267,266,1,0.00029075,">Poaceae;_Triodia_longiceps_[uwaid:33763]_[length:134305]"],
		[268,266,1,0.00024979,">Poaceae;_Triodia_longiceps_[uwaid:22343]_[length:134425]"],
		[269,247,0,0.00022148,""],
		[270,269,0,0.00011329,""],
		[271,270,0,0.00029528,""],
		[272,271,0,0.000019628,""],
		[273,272,0,0.000066767,""],
		[274,273,1,0.0001697,">Poaceae;_Triodia_sp._[uwaid:33720]_[length:134678]"],
		[275,273,1,0.00018845,">Poaceae;_Triodia_sp._Robe_River_[uwaid:22340]_[length:134635]"],
		[276,272,0,0.00019131,""],
		[277,276,1,0.00010406,">Poaceae;_Triodia_sp._[uwaid:33757]_[length:134564]"],
		[278,276,1,0.00011502,">Poaceae;_Triodia_melvillei_[uwaid:22339]_[length:134886]"],
		[279,271,1,0.00027034,">Poaceae;_Triodia_biflora_[uwaid:22341]_[length:134950]"],
		[280,270,0,0.00048079,""],
		[281,280,1,0.00011366,">Poaceae;_Triodia_epactia_[uwaid:33718]_[length:135117]"],
		[282,280,1,0.00012469,">Poaceae;_Triodia_pungens_[uwaid:22348]_[length:134886]"],
		[283,269,0,0.00029641,""],
		[284,283,0,0.00020274,""],
		[285,284,1,0.00016988,">Poaceae;_Triodia_sp._[uwaid:33697]_[length:134554]"],
		[286,284,1,0.0001686,">Poaceae;_Triodia_basitricha_[uwaid:22344]_[length:134577]"],
		[287,283,1,0.00039331,">Poaceae;_Triodia_schinzii_[uwaid:22345]_[length:135107]"],
		[288,246,0,0.00070423,""],
		[289,288,0,0.000041266,""],
		[290,289,0,0.000051047,""],
		[291,290,1,0.00040551,">Poaceae;_Triodia_sp._Shovelanna_Hill_[uwaid:33745]_[length:135262]"],
		[292,290,1,0.00054758,">Poaceae;_Triodia_sp._Peedamulla_[uwaid:22335]_[length:135363]"],
		[293,289,0,0.000096302,""],
		[294,293,0,0.00011637,""],
		[295,294,1,0.00013934,">Poaceae;_Triodia_basedowii_[uwaid:22336]_[length:135380]"],
		[296,294,1,0.00014732,">Poaceae;_Triodia_sp._Warrawagine_[uwaid:22334]_[length:135275]"],
		[297,293,1,0.00028181,">Poaceae;_Triodia_sp._Pannawonica_[uwaid:22333]_[length:135151]"],
		[298,288,0,0.00023268,""],
		[299,298,1,0.00021306,">Poaceae;_Triodia_aff._[uwaid:22338]_[length:135284]"],
		[300,298,1,0.00019698,">Poaceae;_Triodia_lanigera_[uwaid:22337]_[length:135439]"],
		[301,211,1,0.0031846,">Poaceae;_Dactyloctenium_radulans_[uwaid:22355]_[length:135050]"],
		[302,210,0,0.0033252,""],
		[303,302,1,0.00013653,">Poaceae;_Tragus_australianus_[uwaid:33739]_[length:134918]"],
		[304,302,1,0.00012376,">Poaceae;_Tragus_australianus_[uwaid:22267]_[length:134935]"],
		[305,209,0,0.0042025,""],
		[306,305,1,0.00015565,">Poaceae;_Tripogon_loliiformis_[uwaid:33741]_[length:133988]"],
		[307,305,1,0.00015926,">Poaceae;_Tripogonella_loliiformis_[uwaid:22521]_[length:133837]"],
		[308,208,1,0.0043054,">Poaceae;_Perotis_rara_[uwaid:22448]_[length:134323]"],
		[309,207,0,0.002283,""],
		[310,309,0,0.0017215,""],
		[311,310,0,0.00045138,""],
		[312,311,1,0.000067781,">Poaceae;_Sporobolus_australasicus_[uwaid:33806]_[length:135188]"],
		[313,311,1,0.000061776,">Poaceae;_Sporobolus_australasicus_[uwaid:33724]_[length:135078]"],
		[314,310,1,0.00058343,">Poaceae;_Sporobolus_actinocladus_[uwaid:33533]_[length:135544]"],
		[315,309,1,0.00223,">Poaceae;_Sporobolus_virginicus_[uwaid:33604]_[length:135883]"],
		[316,206,1,0.0048186,">Poaceae;_Triraphis_mollis_[uwaid:22320]_[length:134579]"],
		[317,205,0,0.0011594,""],
		[318,317,0,0.0012415,""],
		[319,318,0,0.00015851,""],
		[320,319,0,0.00025865,""],
		[321,320,1,0.0023484,">Poaceae;_Eragrostis_amabilis_var._amabilis_[uwaid:33612]_[length:133846]"],
		[322,320,1,0.0021244,">Poaceae;_Eragrostis_tenellula_[uwaid:22305]_[length:130773]"],
		[323,319,0,0.00036228,""],
		[324,323,0,0.0013918,""],
		[325,324,0,0.00036166,""],
		[326,325,0,0.000076923,""],
		[327,326,0,0.000056294,""],
		[328,327,0,0.000046952,""],
		[329,328,0,0.000042016,""],
		[330,329,0,0.000033228,""],
		[331,330,0,0.00026996,""],
		[332,331,1,0.00002022,">Poaceae;_Eragrostis_dielsii_[uwaid:33734]_[length:134973]"],
		[333,331,1,0.000018384,">Poaceae;_Eragrostis_dielsii_[uwaid:22329]_[length:134952]"],
		[334,330,1,0.00019908,">Poaceae;_Eragrostis_eriopoda_[uwaid:22303]_[length:134934]"],
		[335,329,0,0.000044545,""],
		[336,335,1,0.00017652,">Poaceae;_Eragrostis_desertorum_[uwaid:22538]_[length:134880]"],
		[337,335,1,0.00017145,">Poaceae;_Eragrostis_xerophila_[uwaid:22325]_[length:134858]"],
		[338,328,0,0.00014926,""],
		[339,338,1,0.00012905,">Poaceae;_Eragrostis_pergracilis_[uwaid:33753]_[length:134858]"],
		[340,338,1,0.00012554,">Poaceae;_Eragrostis_pergracilis_[uwaid:22442]_[length:135024]"],
		[341,327,1,0.00029913,">Poaceae;_Eragrostis_xerophila_[uwaid:33704]_[length:134875]"],
		[342,326,1,0.00036139,">Poaceae;_Eragrostis_falcata_[uwaid:33613]_[length:134806]"],
		[343,325,1,0.00046959,">Poaceae;_Eragrostis_setifolia_[uwaid:22304]_[length:134928]"],
		[344,324,1,0.00077716,">Poaceae;_Eragrostis_laniflora_[uwaid:33611]_[length:134677]"],
		[345,323,0,0.0022435,""],
		[346,345,1,0.000057627,">Poaceae;_Eragrostis_crateriformis_[uwaid:33518]_[length:134743]"],
		[347,345,1,0.00013239,">Poaceae;_Eragrostis_leptocarpa_[uwaid:22327]_[length:136330]"],
		[348,318,0,0.0026462,""],
		[349,348,0,0.00004859,""],
		[350,349,1,0.000055207,">Poaceae;_Eragrostis_cumingii_[uwaid:33752]_[length:134756]"],
		[351,349,1,0.000052901,">Poaceae;_Eragrostis_cumingii_[uwaid:22514]_[length:134707]"],
		[352,348,0,0.000084676,""],
		[353,352,1,0.000021719,">Poaceae;_Eragrostis_elongata_[uwaid:33807]_[length:134744]"],
		[354,352,1,0.000026197,">Poaceae;_Eragrostis_elongata_[uwaid:33761]_[length:134833]"],
		[355,317,0,0.0035769,""],
		[356,355,0,0.00028733,""],
		[357,356,0,0.000015636,""],
		[358,357,1,0.00018536,">Poaceae;_Enneapogon_caerulescens_[uwaid:33534]_[length:132941]"],
		[359,357,1,0.0002061,">Poaceae;_Enneapogon_lindleyanus_[uwaid:22321]_[length:133457]"],
		[360,356,0,0.00015636,""],
		[361,360,1,0.00006308,">Poaceae;_Enneapogon_caerulescens_[uwaid:33702]_[length:133244]"],
		[362,360,1,0.000069179,">Poaceae;_Enneapogon_caerulescens_[uwaid:22324]_[length:133231]"],
		[363,355,0,0.00030242,""],
		[364,363,0,0.0001993,""],
		[365,364,1,0,">Poaceae;_Enneapogon_robustissimus_[uwaid:33751]_[length:133558]"],
		[366,364,1,0.000098044,">Poaceae;_Enneapogon_robustissimus_[uwaid:22503]_[length:135810]"],
		[367,363,0,0.00020981,""],
		[368,367,1,0.00001925,">Poaceae;_Enneapogon_polyphyllus_[uwaid:33727]_[length:133454]"],
		[369,367,1,0.000018412,">Poaceae;_Enneapogon_polyphyllus_[uwaid:22298]_[length:133449]"],
		[370,42,0,0.0047375,""],
		[371,370,0,0.00057875,""],
		[372,371,0,0.00043226,""],
		[373,372,0,0.00018909,""],
		[374,373,0,0.00039105,""],
		[375,374,0,0.00028183,""],
		[376,375,0,0.00044863,""],
		[377,376,0,0.00022426,""],
		[378,377,1,0.00010036,">Poaceae;_Eriachne_lanata_[uwaid:33746]_[length:135078]"],
		[379,377,1,0.000083058,">Poaceae;_Eriachne_mucronata_[uwaid:33715]_[length:135074]"],
		[380,376,1,0.00037371,">Poaceae;_Eriachne_mucronata_[uwaid:22381]_[length:135096]"],
		[381,375,1,0.00082779,">Poaceae;_Eriachne_lanata_[uwaid:22266]_[length:136163]"],
		[382,374,1,0.0010176,">Poaceae;_Eriachne_helmsii_[uwaid:22384]_[length:134990]"],
		[383,373,1,0.0016479,">Poaceae;_Eriachne_tenuiculmis_[uwaid:22302]_[length:134850]"],
		[384,372,0,0.00045244,""],
		[385,384,0,0.00014829,""],
		[386,385,0,0.0011897,""],
		[387,386,1,0.0000092138,">Poaceae;_Eriachne_aristidea_[uwaid:33723]_[length:134535]"],
		[388,386,1,0.000013591,">Poaceae;_Eriachne_aristidea_[uwaid:22399]_[length:134598]"],
		[389,385,1,0.00092148,">Poaceae;_Eriachne_benthamii_[uwaid:22379]_[length:133654]"],
		[390,384,0,0.0013092,""],
		[391,390,1,0.0000492,">Poaceae;_Eriachne_benthamii_[uwaid:33735]_[length:134746]"],
		[392,390,1,0.000048909,">Poaceae;_Eriachne_flaccida_[uwaid:22400]_[length:134700]"],
		[393,371,0,0.0020788,""],
		[394,393,1,0.000096184,">Poaceae;_Eriachne_pulchella_[uwaid:33754]_[length:134710]"],
		[395,393,1,0.000090429,">Poaceae;_Eriachne_pulchella_subsp._dominii_[uwaid:33693]_[length:134863]"],
		[396,370,1,0.0030634,">Poaceae;_Eriachne_melicacea_[uwaid:22385]_[length:134982]"],
		[397,41,0,0.0027003,""],
		[398,397,1,0.030827,">Zygophyllaceae;_Zygophyllum_eichleri_[uwaid:33691]_[length:105052]"],
		[399,397,0,0.0042999,""],
		[400,399,0,0.01338,""],
		[401,400,0,0.00060268,""],
		[402,401,0,0.000045711,""],
		[403,402,0,0.00025657,""],
		[404,403,1,0,">Zygophyllaceae;_Tribulus_hirsutus_[uwaid:33617]_[length:159130]"],
		[405,403,1,0.000030621,">Zygophyllaceae;_Tribulus_astrocarpus_[uwaid:33452]_[length:159160]"],
		[406,402,0,0.0002792,""],
		[407,406,1,0.000085727,">Zygophyllaceae;_Tribulus_platypterus_[uwaid:33642]_[length:159197]"],
		[408,406,1,0.000087675,">Zygophyllaceae;_Tribulus_macrocarpus_[uwaid:33454]_[length:159359]"],
		[409,401,1,0.00040807,">Zygophyllaceae;_Tribulus_suberosus_[uwaid:33614]_[length:159114]"],
		[410,400,0,0.001215,""],
		[411,410,1,0.00022735,">Zygophyllaceae;_Tribulus_occidentalis_[uwaid:33621]_[length:158508]"],
		[412,410,1,0.00021725,">Zygophyllaceae;_Tribulus_sp._long-styled_eichlerianus_[uwaid:33455]_[length:158168]"],
		[413,399,0,0.00037924,""],
		[414,413,0,0.0006634,""],
		[415,414,0,0.0010554,""],
		[416,415,0,0.0013787,""],
		[417,416,0,0.00031226,""],
		[418,417,0,0.00040222,""],
		[419,418,0,0.0044222,""],
		[420,419,0,0.0015101,""],
		[421,420,0,0.0047625,""],
		[422,421,1,0.0005169,">Boraginaceae;_Heliotropium_chrysocarpum_[uwaid:22552]_[length:154206]"],
		[423,421,1,0.00042051,">Boraginaceae;_Heliotropium_pachyphyllum_[uwaid:22551]_[length:153628]"],
		[424,420,0,0.0047246,""],
		[425,424,0,0.00026317,""],
		[426,425,0,0.00009538,""],
		[427,426,1,0.00020123,">Boraginaceae;_Heliotropium_heteranthum_[uwaid:22550]_[length:154186]"],
		[428,426,1,0.00041229,">Boraginaceae;_Heliotropium_muticum_[uwaid:22549]_[length:156826]"],
		[429,425,1,0.00015484,">Boraginaceae;_Heliotropium_tanythrix_[uwaid:33465]_[length:154146]"],
		[430,424,1,0.0005246,">Boraginaceae;_Heliotropium_inexplicitum_[uwaid:33627]_[length:154462]"],
		[431,419,1,0.0072256,">Boraginaceae;_Heliotropium_crispatum_[uwaid:33618]_[length:155010]"],
		[432,418,0,0.0069055,""],
		[433,432,0,0.0035555,""],
		[434,433,0,0.0001744,""],
		[435,434,0,0.000073124,""],
		[436,435,0,0.00070597,""],
		[437,436,1,0.00028032,">Solanaceae;_Solanum_elatius_[uwaid:33656]_[length:155402]"],
		[438,436,1,0.00026622,">Solanaceae;_Solanum_elatius_[uwaid:22488]_[length:155510]"],
		[439,435,1,0.0009306,">Solanaceae;_Solanum_ferocissimum_[uwaid:22454]_[length:154620]"],
		[440,434,0,0.00016748,""],
		[441,440,1,0.00089609,">Solanaceae;_Solanum_albostellatum_[uwaid:22478]_[length:156094]"],
		[442,440,1,0.00090628,">Solanaceae;_Solanum_esuriale_[uwaid:22453]_[length:155607]"],
		[443,433,0,0.00018887,""],
		[444,443,0,0.00025098,""],
		[445,444,0,0.00034093,""],
		[446,445,1,0.00042414,">Solanaceae;_Solanum_cleistogamum_[uwaid:33475]_[length:155538]"],
		[447,445,1,0.00053608,">Solanaceae;_Solanum_horridum_[uwaid:22455]_[length:155901]"],
		[448,444,0,0.00034185,""],
		[449,448,0,0.00045823,""],
		[450,449,1,0.000072344,">Solanaceae;_Solanum_diversiflorum_[uwaid:33655]_[length:155523]"],
		[451,449,1,0.000069053,">Solanaceae;_Solanum_diversiflorum_[uwaid:22452]_[length:156603]"],
		[452,448,1,0.00042238,">Solanaceae;_Solanum_phlomoides_[uwaid:22456]_[length:155467]"],
		[453,443,1,0.0011161,">Solanaceae;_Solanum_lasiophyllum_[uwaid:22457]_[length:156807]"],
		[454,432,0,0.0038404,""],
		[455,454,0,0.00030164,""],
		[456,455,0,0.00014319,""],
		[457,456,0,0.000028769,""],
		[458,457,1,0,">Solanaceae;_Nicotiana_occidentalis_subsp._obliqua_[uwaid:22460]_[length:155902]"],
		[459,457,1,0.00064639,">Solanaceae;_Nicotiana_rosulata_subsp._rosulata_[uwaid:22458]_[length:152998]"],
		[460,456,1,0,">Solanaceae;_Nicotiana_occidentalis_subsp._occidentalis_[uwaid:22459]_[length:155988]"],
		[461,455,1,0.00013514,">Solanaceae;_Nicotiana_simulans_[uwaid:33672]_[length:155801]"],
		[462,454,1,0.00046543,">Solanaceae;_Nicotiana_heterantha_[uwaid:22490]_[length:157208]"],
		[463,417,0,0.0035757,""],
		[464,463,0,0.00096914,""],
		[465,464,0,0.010741,""],
		[466,465,1,0.00031621,">Acanthaceae;_Rostellularia_adscendens_var._latifolia_[uwaid:33615]_[length:150556]"],
		[467,465,1,0.00027154,">Acanthaceae;_Rostellularia_adscendens_var._clementii_[uwaid:22554]_[length:150491]"],
		[468,464,1,0.01321,">Acanthaceae;_Dipteracanthus_australasicus_subsp._australasicus_[uwaid:33496]_[length:152173]"],
		[469,463,0,0.0078993,""],
		[470,469,0,0.0000086177,""],
		[471,470,0,0.0002323,""],
		[472,471,0,0.00009465,""],
		[473,472,0,0.00051958,""],
		[474,473,0,0.000062459,""],
		[475,474,0,0.000083394,""],
		[476,475,0,0.000026033,""],
		[477,476,1,0.00013016,">Scrophulariaceae;_Eremophila_latrobei_subsp._filiformis_[uwaid:22470]_[length:151670]"],
		[478,476,1,0.00017599,">Scrophulariaceae;_Eremophila_pilosa_[uwaid:22464]_[length:151709]"],
		[479,475,1,0.00019018,">Scrophulariaceae;_Eremophila_forrestii_subsp._forrestii_[uwaid:22480]_[length:151689]"],
		[480,474,1,0.00026447,">Scrophulariaceae;_Eremophila_lanceolata_[uwaid:33540]_[length:151715]"],
		[481,473,1,0.00036808,">Scrophulariaceae;_Eremophila_pusilliflora_[uwaid:22472]_[length:151713]"],
		[482,472,1,0.00084006,">Scrophulariaceae;_Eremophila_spongiocarpa_[uwaid:22481]_[length:151757]"],
		[483,471,0,0.00090059,""],
		[484,483,0,0.000077149,""],
		[485,484,1,0.000013446,">Chenopodiaceae;_Tecticornia_medusa_[uwaid:33582]_[length:152109]"],
		[486,484,1,0.0000083611,">Scrophulariaceae;_Eremophila_magnifica_subsp._magnifica_[uwaid:33453]_[length:152032]"],
		[487,483,1,0.00010472,">Scrophulariaceae;_Eremophila_magnifica_subsp._velutina_[uwaid:33450]_[length:151989]"],
		[488,470,0,0.00033286,""],
		[489,488,0,0.00026748,""],
		[490,489,1,0.0019303,">Scrophulariaceae;_Eremophila_youngii_subsp._lepidota_[uwaid:22471]_[length:129803]"],
		[491,489,1,0.00088346,">Scrophulariaceae;_Eremophila_longifolia_[uwaid:22468]_[length:151737]"],
		[492,488,1,0.0011358,">Scrophulariaceae;_Eremophila_maculata_subsp._brevifolia_[uwaid:33474]_[length:152643]"],
		[493,469,0,0.00060012,""],
		[494,493,1,0.00065465,">Scrophulariaceae;_Eremophila_platycalyx_subsp._pardalota_[uwaid:33473]_[length:152019]"],
		[495,493,1,0.00067696,">Scrophulariaceae;_Eremophila_cuneifolia_[uwaid:22559]_[length:151996]"],
		[496,416,0,0.001333,""],
		[497,496,0,0.001351,""],
		[498,497,0,0.010105,""],
		[499,498,0,0.00095224,""],
		[500,499,0,0.00094564,""],
		[501,500,0,0.0036491,""],
		[502,501,1,0.00055292,">Rubiaceae;_Oldenlandia_crouchiana_[uwaid:33622]_[length:154235]"],
		[503,501,1,0.00050651,">Rubiaceae;_Oldenlandia_sp._Hamersley_Station_[uwaid:33459]_[length:154143]"],
		[504,500,1,0.0045932,">Rubiaceae;_Synaptantha_tillaeacea_var._tillaeacea_[uwaid:33470]_[length:151806]"],
		[505,499,1,0.0052403,">Rubiaceae;_Spermacoce_brachystema_[uwaid:33471]_[length:154436]"],
		[506,498,1,0.0057966,">Rubiaceae;_Dentella_asperata_[uwaid:33469]_[length:152844]"],
		[507,497,1,0.012387,">Rubiaceae;_Psydrax_latifolia_[uwaid:33472]_[length:152181]"],
		[508,496,1,0.011713,">Apocynaceae;_Gymnanthera_cunninghamii_[uwaid:33461]_[length:153505]"],
		[509,415,0,0.0019266,""],
		[510,509,0,0.0015616,""],
		[511,510,0,0.0023064,""],
		[512,511,0,0.010695,""],
		[513,512,1,0.0065785,">Goodeniaceae;_Dampiera_anonyma_[uwaid:22383]_[length:173341]"],
		[514,512,1,0.0056244,">Goodeniaceae;_Dampiera_candicans_[uwaid:22281]_[length:154208]"],
		[515,511,0,0.011803,""],
		[516,515,0,0.0023022,""],
		[517,516,0,0.0040173,""],
		[518,517,0,0.0023661,""],
		[519,518,0,0.0027384,""],
		[520,519,0,0.0010212,""],
		[521,520,0,0.0014177,""],
		[522,521,0,0.00024239,""],
		[523,522,0,0.0049975,""],
		[524,523,0,0.0017531,""],
		[525,524,1,0.0074896,">Goodeniaceae;_Scaevola_amblyanthera_var._amblyanthera_[uwaid:22542]_[length:58642]"],
		[526,524,1,0.0091326,">Goodeniaceae;_Scaevola_parvifolia_subsp._pilbarae_[uwaid:22292]_[length:60034]"],
		[527,523,1,0,">Goodeniaceae;_Scaevola_amblyanthera_var._centralis_[uwaid:22319]_[length:122990]"],
		[528,522,1,0.0023855,">Goodeniaceae;_Scaevola_crassifolia_[uwaid:22293]_[length:120742]"],
		[529,521,1,0.0031755,">Goodeniaceae;_Scaevola_sericophylla_[uwaid:22441]_[length:121484]"],
		[530,520,1,0.0020656,">Goodeniaceae;_Scaevola_browniana_subsp._browniana_[uwaid:22290]_[length:154143]"],
		[531,519,1,0.0016415,">Goodeniaceae;_Scaevola_acacioides_[uwaid:33580]_[length:163853]"],
		[532,518,1,0.0041202,">Goodeniaceae;_Scaevola_sp._Hamersley_Range_basalts_[uwaid:22547]_[length:136766]"],
		[533,517,1,0.0081692,">Goodeniaceae;_Scaevola_parvifolia_subsp._pilbarae_[uwaid:22280]_[length:72446]"],
		[534,516,1,0.016883,">Goodeniaceae;_Goodenia_stobbsiana_[uwaid:22526]_[length:69554]"],
		[535,515,0,0.005367,""],
		[536,535,0,0.0011049,""],
		[537,536,0,0.0087613,""],
		[538,537,0,0.00054024,""],
		[539,538,0,0.0039743,""],
		[540,539,0,0.012574,""],
		[541,540,0,0.0034517,""],
		[542,541,1,0.0038278,">Goodeniaceae;_Goodenia_forrestii_[uwaid:22522]_[length:63561]"],
		[543,541,1,0,">Goodeniaceae;_Goodenia_muelleriana_[uwaid:22286]_[length:86268]"],
		[544,540,1,0.0075434,">Goodeniaceae;_Goodenia_prostrata_[uwaid:22544]_[length:36243]"],
		[545,539,1,0.02049,">Goodeniaceae;_Goodenia_sp._East_Pilbara_[uwaid:22291]_[length:35295]"],
		[546,538,1,0.014114,">Goodeniaceae;_Goodenia_lamprosperma_[uwaid:22288]_[length:96820]"],
		[547,537,1,0.018358,">Goodeniaceae;_Velleia_connata_[uwaid:33644]_[length:74121]"],
		[548,536,0,0.0098942,""],
		[549,548,0,0.0046745,""],
		[550,549,0,0.0057351,""],
		[551,550,1,0.0016957,">Goodeniaceae;_Goodenia_nuda_[uwaid:33495]_[length:102662]"],
		[552,550,1,0.0025381,">Goodeniaceae;_Goodenia_microptera_[uwaid:22287]_[length:73040]"],
		[553,549,1,0,">Goodeniaceae;_Goodenia_triodiophila_[uwaid:22294]_[length:108548]"],
		[554,548,1,0,">Goodeniaceae;_Goodenia_cusackiana_[uwaid:22289]_[length:89844]"],
		[555,535,1,0.012069,">Goodeniaceae;_Goodenia_stellata_[uwaid:22546]_[length:76874]"],
		[556,510,0,0.0048608,""],
		[557,556,0,0.000079051,""],
		[558,557,0,0.00067413,""],
		[559,558,0,0.00047419,""],
		[560,559,0,0.0017172,""],
		[561,560,1,0.0035659,">Asteraceae;_Sonchus_oleraceus_[uwaid:33791]_[length:151807]"],
		[562,560,1,0.0037766,">Asteraceae;_Lactuca_serriola_[uwaid:33772]_[length:152792]"],
		[563,559,1,0.0042198,">Asteraceae;_Pleurocarpaea_gracilis_[uwaid:22318]_[length:150715]"],
		[564,558,0,0.00061808,""],
		[565,564,0,0.00049849,""],
		[566,565,0,0.00082428,""],
		[567,566,0,0.00070313,""],
		[568,567,0,0.00034994,""],
		[569,568,1,0.002853,">Asteraceae;_Sigesbeckia_orientalis_[uwaid:33790]_[length:151797]"],
		[570,568,1,0.0049726,">Asteraceae;_Pentalepis_trichodesmoides_[uwaid:22273]_[length:140834]"],
		[571,567,0,0.0027609,""],
		[572,571,0,0.000011588,""],
		[573,572,1,0.000060252,">Asteraceae;_Flaveria_sp._Tom_Price_[uwaid:33788]_[length:152349]"],
		[574,572,1,0.00006654,">Asteraceae;_Flaveria_trinervia_[uwaid:33774]_[length:152310]"],
		[575,571,1,0.00008259,">Asteraceae;_Flaveria_trinervia_[uwaid:22285]_[length:152477]"],
		[576,566,0,0.003106,""],
		[577,576,1,0.000168,">Asteraceae;_Centipeda_minima_subsp._macrocephala_[uwaid:33782]_[length:152511]"],
		[578,576,1,0.00017001,">Asteraceae;_Centipeda_minima_subsp._macrocephala_[uwaid:22277]_[length:153113]"],
		[579,565,0,0.0051521,""],
		[580,579,0,0.00013858,""],
		[581,580,1,0.000036325,">Asteraceae;_Bidens_subalternans_var._simulans_[uwaid:33789]_[length:151447]"],
		[582,580,1,0.000042705,">Asteraceae;_Bidens_subalternans_var._simulans_[uwaid:22275]_[length:151602]"],
		[583,579,1,0.00035735,">Asteraceae;_Bidens_sp._[uwaid:33798]_[length:141250]"],
		[584,564,0,0.00087,""],
		[585,584,0,0.0024993,""],
		[586,585,0,0.00080185,""],
		[587,586,0,0.00012454,""],
		[588,587,0,0.000069391,""],
		[589,588,0,0.00041657,""],
		[590,589,1,0.0000093468,">Asteraceae;_Pluchea_rubelliflora_[uwaid:33794]_[length:152305]"],
		[591,589,1,0.000049895,">Asteraceae;_Pluchea_rubelliflora_[uwaid:22270]_[length:152525]"],
		[592,588,0,0.00041315,""],
		[593,592,1,0.00012721,">Asteraceae;_Pluchea_dentex_[uwaid:33793]_[length:152234]"],
		[594,592,1,0.000092095,">Asteraceae;_Pluchea_dentex_[uwaid:22268]_[length:152284]"],
		[595,587,0,0.00028771,""],
		[596,595,0,0.00013794,""],
		[597,596,0,0.000012998,""],
		[598,597,0,0.000059786,""],
		[599,598,1,0.000014177,">Asteraceae;_Streptoglossa_bubakii_[uwaid:33771]_[length:152286]"],
		[600,598,1,0.000042476,">Asteraceae;_Streptoglossa_bubakii_[uwaid:22432]_[length:152591]"],
		[601,597,1,0.00007859,">Asteraceae;_Streptoglossa_liatroides_[uwaid:33797]_[length:152259]"],
		[602,596,0,0.000024047,""],
		[603,602,1,0.000065761,">Asteraceae;_Streptoglossa_decurrens_[uwaid:33522]_[length:152249]"],
		[604,602,1,0.000070984,">Asteraceae;_Streptoglossa_odora_[uwaid:22510]_[length:152728]"],
		[605,595,0,0.00015771,""],
		[606,605,0,0.000010291,""],
		[607,606,0,0.000034909,""],
		[608,607,1,0.000026748,">Asteraceae;_Streptoglossa_liatroides_[uwaid:33778]_[length:152325]"],
		[609,607,1,0.000040995,">Asteraceae;_Streptoglossa_adscendens_[uwaid:33521]_[length:152391]"],
		[610,606,1,0.000069871,">Asteraceae;_Streptoglossa_cylindriceps_[uwaid:33776]_[length:152307]"],
		[611,605,1,0.000085022,">Asteraceae;_Streptoglossa_cylindriceps_[uwaid:22476]_[length:152722]"],
		[612,586,0,0.00048113,""],
		[613,612,0,0.00015498,""],
		[614,613,1,0.00012745,">Asteraceae;_Pluchea_tetranthera_[uwaid:22517]_[length:151158]"],
		[615,613,1,0.000035205,">Asteraceae;_Pluchea_ferdinandi-muelleri_[uwaid:22271]_[length:152725]"],
		[616,612,1,0.00017566,">Asteraceae;_Pluchea_dunlopii_[uwaid:22272]_[length:152463]"],
		[617,585,0,0.0012525,""],
		[618,617,0,0.000027739,""],
		[619,618,0,0.000019831,""],
		[620,619,0,0.000010531,""],
		[621,620,1,0.000026285,">Asteraceae;_Pterocaulon_sphaeranthoides_[uwaid:22279]_[length:152213]"],
		[622,620,1,0.00011104,">Asteraceae;_Pterocaulon_serrulatum_var._velutinum_[uwaid:22276]_[length:152010]"],
		[623,619,1,0.000038029,">Asteraceae;_Pterocaulon_sphacelatum_[uwaid:22274]_[length:152297]"],
		[624,618,1,0.00005991,">Asteraceae;_Pterocaulon_sphacelatum_[uwaid:33773]_[length:152249]"],
		[625,617,1,0.00010447,">Asteraceae;_Pterocaulon_intermedium_[uwaid:33448]_[length:151251]"],
		[626,584,0,0.0043337,""],
		[627,626,1,0.000027968,">Asteraceae;_Blumea_tenella_[uwaid:33781]_[length:150811]"],
		[628,626,1,0.000041301,">Asteraceae;_Blumea_tenella_[uwaid:22269]_[length:151303]"],
		[629,557,0,0.0048765,""],
		[630,629,0,0.00070522,""],
		[631,630,0,0.00045808,""],
		[632,631,0,0.00016992,""],
		[633,632,0,0.00011706,""],
		[634,633,1,0.00081365,">Asteraceae;_Iotasperma_sessilifolium_[uwaid:33444]_[length:152118]"],
		[635,633,1,0.00055593,">Asteraceae;_Calotis_squamigera_[uwaid:22284]_[length:152219]"],
		[636,632,0,0.00041149,""],
		[637,636,0,0.00012183,""],
		[638,637,0,0.000027392,""],
		[639,638,0,0.00013093,""],
		[640,639,1,0.0000049102,">Asteraceae;_Peripleura_arida_[uwaid:33792]_[length:152353]"],
		[641,639,1,0.000005957,">Asteraceae;_Peripleura_arida_[uwaid:22516]_[length:152426]"],
		[642,638,1,0.00015063,">Asteraceae;_Vittadinia_arida_[uwaid:33796]_[length:152511]"],
		[643,637,0,0.00016487,""],
		[644,643,1,0.0000030906,">Asteraceae;_Vittadinia_sp._Coondewanna_Flats_[uwaid:33786]_[length:152313]"],
		[645,643,1,0.0000029118,">Asteraceae;_Vittadinia_sp._Coondewanna_Flats_[uwaid:22403]_[length:152363]"],
		[646,636,1,0.00028844,">Asteraceae;_Peripleura_obovata_[uwaid:33809]_[length:152264]"],
		[647,631,0,0.00093172,""],
		[648,647,1,0.00025503,">Asteraceae;_Calotis_porphyroglossa_[uwaid:33805]_[length:152777]"],
		[649,647,1,0.00029098,">Asteraceae;_Calotis_plumulifera_[uwaid:22380]_[length:153279]"],
		[650,630,1,0.0014452,">Asteraceae;_Peripleura_virgata_[uwaid:33779]_[length:152012]"],
		[651,629,1,0.0023803,">Asteraceae;_Roebuckiella_similis_[uwaid:33785]_[length:152832]"],
		[652,556,0,0.0041507,""],
		[653,652,0,0.00087396,""],
		[654,653,0,0.000087947,""],
		[655,654,0,0.00012563,""],
		[656,655,0,0.00042888,""],
		[657,656,1,0.0020262,">Asteraceae;_Rhodanthe_margarethae_[uwaid:33795]_[length:153351]"],
		[658,656,1,0.0020131,">Asteraceae;_Calocephalus_sp._Wittenoom_[uwaid:33787]_[length:153215]"],
		[659,655,0,0.0022506,""],
		[660,659,1,0.00033637,">Asteraceae;_Chrysocephalum_gilesii_[uwaid:33783]_[length:154259]"],
		[661,659,1,0.00034199,">Asteraceae;_Chrysocephalum_gilesii_[uwaid:22278]_[length:154439]"],
		[662,654,0,0.00038054,""],
		[663,662,1,0.0021111,">Asteraceae;_Calocephalus_beardii_[uwaid:33777]_[length:153016]"],
		[664,662,1,0.0023847,">Asteraceae;_Gnephosis_arachnoidea_[uwaid:22282]_[length:153612]"],
		[665,653,1,0.0027401,">Asteraceae;_Angianthus_tomentosus_[uwaid:22283]_[length:153687]"],
		[666,652,1,0.004055,">Asteraceae;_Rhodanthe_collina_[uwaid:33443]_[length:153713]"],
		[667,509,0,0.0055209,""],
		[668,667,1,0.011843,">Stylidiaceae;_Stylidium_weeliwolli_[uwaid:33460]_[length:150611]"],
		[669,667,1,0.011023,">Stylidiaceae;_Stylidium_desertorum_[uwaid:33458]_[length:151482]"],
		[670,414,0,0.0063607,""],
		[671,670,0,0.0019607,""],
		[672,671,0,0.00030548,""],
		[673,672,0,0.00024226,""],
		[674,673,0,0.0014851,""],
		[675,674,0,0.0067753,""],
		[676,675,0,0.0004711,""],
		[677,676,0,0.000098093,""],
		[678,677,0,0.001259,""],
		[679,678,1,0,">Chenopodiaceae;_Tecticornia_indica_subsp._leiostachya_[uwaid:22479]_[length:152832]"],
		[680,678,1,0.00071638,">Chenopodiaceae;_Tecticornia_indica_subsp._bidens_[uwaid:22477]_[length:151889]"],
		[681,677,1,0.0012872,">Chenopodiaceae;_Tecticornia_auriculata_[uwaid:22390]_[length:151117]"],
		[682,676,1,0.0011953,">Chenopodiaceae;_Tecticornia_sp._Christmas_Creek_[uwaid:33486]_[length:152735]"],
		[683,675,0,0.0012669,""],
		[684,683,0,0.00018473,""],
		[685,684,0,0.000007461,""],
		[686,685,1,0.0000075283,">Malvaceae;_Hibiscus_campanulatus_[uwaid:33447]_[length:152630]"],
		[687,685,1,0.000002365,">Chenopodiaceae;_Tecticornia_halocnemoides_subsp._tenuis_[uwaid:22475]_[length:152560]"],
		[688,684,1,0.00001106,">Chenopodiaceae;_Tecticornia_halocnemoides_subsp._tenuis_[uwaid:33445]_[length:152560]"],
		[689,683,1,0.00019829,">Chenopodiaceae;_Tecticornia_sp._Dennys_Crossing_[uwaid:33492]_[length:152654]"],
		[690,674,0,0.0077613,""],
		[691,690,0,0.0001681,""],
		[692,691,0,0.00023659,""],
		[693,692,0,0.000041423,""],
		[694,693,0,0.000037271,""],
		[695,694,0,0.00047163,""],
		[696,695,0,0.0001895,""],
		[697,696,0,0.00015712,""],
		[698,697,0,0.00087629,""],
		[699,698,0,0.0016699,""],
		[700,699,1,0,">Chenopodiaceae;_Enchylaena_tomentosa_var._tomentosa_[uwaid:33657]_[length:151162]"],
		[701,699,1,0.0011176,">Chenopodiaceae;_Maireana_georgei_[uwaid:22396]_[length:123681]"],
		[702,698,1,0,">Chenopodiaceae;_Maireana_pyramidata_[uwaid:22313]_[length:148473]"],
		[703,697,1,0,">Chenopodiaceae;_Maireana_amoena_[uwaid:33583]_[length:157139]"],
		[704,696,1,0,">Chenopodiaceae;_Sclerolaena_recurvicuspis_[uwaid:33467]_[length:150619]"],
		[705,695,1,0.000035814,">Chenopodiaceae;_Sclerolaena_cuneata_[uwaid:33610]_[length:150650]"],
		[706,694,1,0.00037605,">Chenopodiaceae;_Maireana_tomentosa_subsp._tomentosa_[uwaid:22352]_[length:151192]"],
		[707,693,0,0.000044043,""],
		[708,707,0,0.000053112,""],
		[709,708,0,0.00007442,""],
		[710,709,1,0.00030035,">Chenopodiaceae;_Maireana_luehmannii_[uwaid:33530]_[length:151214]"],
		[711,709,1,0.00030102,">Chenopodiaceae;_Maireana_triptera_[uwaid:22389]_[length:151318]"],
		[712,708,1,0.00034709,">Chenopodiaceae;_Sclerolaena_eriacantha_[uwaid:22548]_[length:151080]"],
		[713,707,1,0.00048346,">Chenopodiaceae;_Sclerolaena_costata_[uwaid:33464]_[length:152422]"],
		[714,692,0,0.00010098,""],
		[715,714,1,0.00052221,">Chenopodiaceae;_Sclerolaena_glabra_[uwaid:33466]_[length:151327]"],
		[716,714,1,0.00052247,">Chenopodiaceae;_Sclerolaena_densiflora_[uwaid:33451]_[length:150664]"],
		[717,691,0,0.00025144,""],
		[718,717,0,0.00024887,""],
		[719,718,1,0.00016463,">Chenopodiaceae;_Sclerolaena_bicornis_var._bicornis_[uwaid:33659]_[length:150986]"],
		[720,718,1,0.00016324,">Chenopodiaceae;_Sclerolaena_cornishiana_[uwaid:33463]_[length:151041]"],
		[721,717,1,0.00029963,">Chenopodiaceae;_Maireana_carnosa_[uwaid:22543]_[length:150918]"],
		[722,690,0,0.00043516,""],
		[723,722,0,0.00012333,""],
		[724,723,1,0.00046931,">Chenopodiaceae;_Maireana_villosa_[uwaid:22535]_[length:151360]"],
		[725,723,1,0.00023493,">Chenopodiaceae;_Maireana_integra_[uwaid:22416]_[length:152645]"],
		[726,722,1,0.00027974,">Chenopodiaceae;_Maireana_planifolia_[uwaid:22372]_[length:151386]"],
		[727,673,0,0.0018849,""],
		[728,727,0,0.0034346,""],
		[729,728,0,0.004035,""],
		[730,729,0,0.0011978,""],
		[731,730,0,0.00014491,""],
		[732,731,1,0.00056559,">Chenopodiaceae;_Atriplex_codonocarpa_[uwaid:22487]_[length:152080]"],
		[733,731,1,0.00059081,">Chenopodiaceae;_Atriplex_flabelliformis_[uwaid:22486]_[length:150819]"],
		[734,730,1,0.00068659,">Chenopodiaceae;_Atriplex_lindleyi_subsp._conduplicata_[uwaid:33581]_[length:152206]"],
		[735,729,1,0.001061,">Chenopodiaceae;_Atriplex_bunburyana_[uwaid:33620]_[length:92303]"],
		[736,728,0,0.0052075,""],
		[737,736,0,0.00012787,""],
		[738,737,1,0.00010944,">Chenopodiaceae;_Rhagodia_preissii_subsp._obovata_[uwaid:33488]_[length:152292]"],
		[739,737,1,0.00011039,">Chenopodiaceae;_Rhagodia_eremaea_[uwaid:33487]_[length:152266]"],
		[740,736,1,0.00026073,">Chenopodiaceae;_Rhagodia_sp._Hamersley_[uwaid:22428]_[length:152361]"],
		[741,727,0,0.0079919,""],
		[742,741,0,0.00020655,""],
		[743,742,1,0.00015781,">Chenopodiaceae;_Dysphania_kalpari_[uwaid:33653]_[length:152161]"],
		[744,742,1,0.00016754,">Chenopodiaceae;_Dysphania_rhadinostachya_subsp._rhadinostachya_[uwaid:33626]_[length:152179]"],
		[745,741,1,0.00038525,">Chenopodiaceae;_Dysphania_rhadinostachya_subsp._inflata_[uwaid:33670]_[length:152164]"],
		[746,672,0,0.0009666,""],
		[747,746,0,0.0090398,""],
		[748,747,1,0.00041975,">Amaranthaceae;_Amaranthus_induratus_[uwaid:33490]_[length:150805]"],
		[749,747,1,0.00038587,">Amaranthaceae;_Amaranthus_cuspidifolius_[uwaid:22466]_[length:151180]"],
		[750,746,1,0.0086804,">Amaranthaceae;_Surreya_diandra_[uwaid:22463]_[length:153848]"],
		[751,671,0,0.0045515,""],
		[752,751,0,0.00045239,""],
		[753,752,0,0.00080747,""],
		[754,753,0,0.0066753,""],
		[755,754,1,0.00028725,">Amaranthaceae;_Alternanthera_denticulata_[uwaid:33595]_[length:152058]"],
		[756,754,1,0.00029204,">Amaranthaceae;_Alternanthera_nana_[uwaid:22500]_[length:152117]"],
		[757,753,0,0.0071923,""],
		[758,757,1,0,">Amaranthaceae;_Achyranthes_aspera_[uwaid:33529]_[length:151935]"],
		[759,757,1,0.0012366,">Amaranthaceae;_Alternanthera_denticulata_[uwaid:33528]_[length:125172]"],
		[760,752,0,0.0016689,""],
		[761,760,0,0.0013763,""],
		[762,761,0,0.00023446,""],
		[763,762,0,0.000305,""],
		[764,763,0,0.00027815,""],
		[765,764,0,0.00032319,""],
		[766,765,0,0.0021419,""],
		[767,766,1,0.00010114,">Amaranthaceae;_Ptilotus_gomphrenoides_[uwaid:33586]_[length:151112]"],
		[768,766,1,0.00010803,">Cyperaceae;_Bulbostylis_burbidgeae_[uwaid:22350]_[length:151352]"],
		[769,765,1,0.0021733,">Amaranthaceae;_Ptilotus_arthrolasius_[uwaid:33650]_[length:151386]"],
		[770,764,0,0.0018022,""],
		[771,770,0,0.00013657,""],
		[772,771,1,0.00057091,">Amaranthaceae;_Ptilotus_latifolius_[uwaid:33801]_[length:150369]"],
		[773,771,1,0.00057948,">Amaranthaceae;_Ptilotus_villosiflorus_[uwaid:33800]_[length:150560]"],
		[774,770,1,0.00073254,">Amaranthaceae;_Ptilotus_chamaecladus_[uwaid:33799]_[length:150243]"],
		[775,763,0,0.0005991,""],
		[776,775,0,0.0013757,""],
		[777,776,1,0.00099175,">Amaranthaceae;_Ptilotus_astrolasius_[uwaid:33766]_[length:153190]"],
		[778,776,1,0.00068697,">Amaranthaceae;_Ptilotus_roei_[uwaid:33660]_[length:152834]"],
		[779,775,1,0.0025455,">Amaranthaceae;_Ptilotus_wilsonii_[uwaid:33686]_[length:145742]"],
		[780,762,0,0.00047477,""],
		[781,780,0,0.00035412,""],
		[782,781,0,0.00023284,""],
		[783,782,0,0.00016795,""],
		[784,783,0,0.0001407,""],
		[785,784,0,0.000084054,""],
		[786,785,1,0.0021244,">Amaranthaceae;_Ptilotus_divaricatus_[uwaid:33688]_[length:149455]"],
		[787,785,1,0.0020642,">Amaranthaceae;_Ptilotus_rotundifolius_[uwaid:22382]_[length:150732]"],
		[788,784,1,0.001995,">Amaranthaceae;_Ptilotus_auriculifolius_[uwaid:22501]_[length:150393]"],
		[789,783,1,0.0021624,">Amaranthaceae;_Ptilotus_polakii_subsp._juxtus_[uwaid:33775]_[length:150327]"],
		[790,782,1,0.0022328,">Amaranthaceae;_Ptilotus_mollis_[uwaid:22523]_[length:149539]"],
		[791,781,0,0.00090928,""],
		[792,791,0,0.00024051,""],
		[793,792,0,0.0013614,""],
		[794,793,0,0.00087567,""],
		[795,794,0,0.0010337,""],
		[796,795,0,0.0011233,""],
		[797,796,1,0,">Amaranthaceae;_Ptilotus_trichocephalus_[uwaid:33669]_[length:153455]"],
		[798,796,1,0.004959,">Amaranthaceae;_Ptilotus_incanus_[uwaid:22387]_[length:73548]"],
		[799,795,1,0,">Amaranthaceae;_Ptilotus_obovatus_[uwaid:22524]_[length:155620]"],
		[800,794,1,0,">Amaranthaceae;_Ptilotus_axillaris_[uwaid:33491]_[length:152869]"],
		[801,793,1,0.00043499,">Amaranthaceae;_Ptilotus_nobilis_subsp._nobilis_[uwaid:22519]_[length:154763]"],
		[802,792,1,0.0017637,">Amaranthaceae;_Ptilotus_aervoides_[uwaid:33764]_[length:152921]"],
		[803,791,1,0.0020547,">Amaranthaceae;_Ptilotus_appendiculatus_[uwaid:33803]_[length:149774]"],
		[804,780,0,0.0011727,""],
		[805,804,0,0.00023443,""],
		[806,805,0,0.00032011,""],
		[807,806,0,0.0001884,""],
		[808,807,0,0.00006949,""],
		[809,808,0,0.00030839,""],
		[810,809,1,0.00047979,">Amaranthaceae;_Ptilotus_fusiformis_[uwaid:22331]_[length:147944]"],
		[811,809,1,0.00049482,">Amaranthaceae;_Ptilotus_macrocephalus_[uwaid:22330]_[length:148533]"],
		[812,808,1,0.00087188,">Amaranthaceae;_Ptilotus_clementii_[uwaid:22332]_[length:150494]"],
		[813,807,0,0.00085164,""],
		[814,813,0,0.00019692,""],
		[815,814,0,0.00020048,""],
		[816,815,1,0.000038899,">Amaranthaceae;_Ptilotus_schwartzii_[uwaid:33619]_[length:149925]"],
		[817,815,1,0.000014323,">Amaranthaceae;_Ptilotus_schwartzii_[uwaid:33589]_[length:149965]"],
		[818,814,1,0.00040398,">Amaranthaceae;_Ptilotus_calostachyus_[uwaid:33804]_[length:149862]"],
		[819,813,1,0.00036937,">Amaranthaceae;_Ptilotus_drummondii_[uwaid:33743]_[length:149962]"],
		[820,806,1,0.0011047,">Amaranthaceae;_Ptilotus_polystachyus_[uwaid:33596]_[length:150202]"],
		[821,805,0,0.001462,""],
		[822,821,1,0.00004269,">Amaranthaceae;_Ptilotus_helipteroides_[uwaid:33489]_[length:150210]"],
		[823,821,1,0.00010803,">Amaranthaceae;_Ptilotus_helipteroides_[uwaid:22533]_[length:151395]"],
		[824,804,1,0.0018813,">Amaranthaceae;_Ptilotus_gaudichaudii_subsp._gaudichaudii_[uwaid:22520]_[length:150195]"],
		[825,761,1,0.0034421,">Amaranthaceae;_Ptilotus_subspinescens_[uwaid:33516]_[length:151314]"],
		[826,760,1,0.0050755,">Amaranthaceae;_Aerva_javanica_[uwaid:33802]_[length:152488]"],
		[827,751,0,0.0055093,""],
		[828,827,0,0.00098969,""],
		[829,828,0,0.000069667,""],
		[830,829,0,0.00013659,""],
		[831,830,0,0.00097418,""],
		[832,831,1,0.000010408,">Amaranthaceae;_Gomphrena_leptophylla_[uwaid:33590]_[length:152601]"],
		[833,831,1,0.000011228,">Amaranthaceae;_Gomphrena_leptophylla_[uwaid:22532]_[length:152584]"],
		[834,830,1,0.0013061,">Amaranthaceae;_Gomphrena_affinis_subsp._pilbarensis_[uwaid:33588]_[length:152122]"],
		[835,829,1,0.0013485,">Amaranthaceae;_Gomphrena_cunninghamii_[uwaid:33591]_[length:152223]"],
		[836,828,0,0.00058459,""],
		[837,836,0,0.00092996,""],
		[838,837,1,0.000068026,">Amaranthaceae;_Gomphrena_pusilla_[uwaid:33616]_[length:154364]"],
		[839,837,1,0.000012012,">Amaranthaceae;_Gomphrena_pusilla_[uwaid:33585]_[length:153535]"],
		[840,836,1,0.0011676,">Amaranthaceae;_Gomphrena_leptoclada_subsp._leptoclada_[uwaid:33584]_[length:143028]"],
		[841,827,1,0.0011875,">Asteraceae;_Rhodanthe_floribunda_[uwaid:33784]_[length:152245]"],
		[842,670,0,0.012375,""],
		[843,842,1,0.00055892,">Caryophyllaceae;_Polycarpaea_longiflora_[uwaid:33668]_[length:153438]"],
		[844,842,1,0.00054257,">Caryophyllaceae;_Polycarpaea_holtzei_[uwaid:33628]_[length:153435]"],
		[845,413,0,0.00092237,""],
		[846,845,0,0.00065448,""],
		[847,846,0,0.00079093,""],
		[848,847,0,0.0051693,""],
		[849,848,0,0.0068268,""],
		[850,849,0,0.00048426,""],
		[851,850,0,0.0001323,""],
		[852,851,0,0.00029925,""],
		[853,852,1,0.00062314,">Sapindaceae;_Dodonaea_viscosa_subsp._mucronata_[uwaid:33684]_[length:159418]"],
		[854,852,1,0.0005619,">Sapindaceae;_Dodonaea_lanceolata_var._lanceolata_[uwaid:33683]_[length:159492]"],
		[855,851,1,0.0008991,">Sapindaceae;_Dodonaea_pachyneura_[uwaid:33667]_[length:159189]"],
		[856,850,0,0.00096116,""],
		[857,856,1,0.000095573,">Sapindaceae;_Dodonaea_coriacea_[uwaid:33640]_[length:159008]"],
		[858,856,1,0.000018998,">Sapindaceae;_Dodonaea_coriacea_[uwaid:33625]_[length:156987]"],
		[859,849,1,0.0014542,">Sapindaceae;_Dodonaea_petiolaris_[uwaid:33652]_[length:157001]"],
		[860,848,1,0.0083287,">Sapindaceae;_Atalaya_hemiglauca_[uwaid:33690]_[length:160827]"],
		[861,847,0,0.0063056,""],
		[862,861,0,0.00039017,""],
		[863,862,0,0.0008475,""],
		[864,863,0,0.001448,""],
		[865,864,0,0.0025167,""],
		[866,865,1,0.0010346,">Malvaceae;_Androcalva_loxophylla_[uwaid:22474]_[length:159725]"],
		[867,865,1,0.0010248,">Malvaceae;_Androcalva_luteiflora_[uwaid:22473]_[length:159572]"],
		[868,864,0,0.0031439,""],
		[869,868,1,0.00034002,">Malvaceae;_Seringia_elliptica_[uwaid:33484]_[length:158696]"],
		[870,868,1,0.00034815,">Malvaceae;_Seringia_nephrosperma_[uwaid:33478]_[length:158821]"],
		[871,863,0,0.0023952,""],
		[872,871,0,0.0029945,""],
		[873,872,1,0.000060341,">Malvaceae;_Malvastrum_americanum_[uwaid:33680]_[length:160215]"],
		[874,872,1,0.000057454,">Malvaceae;_Waltheria_indica_[uwaid:22461]_[length:160110]"],
		[875,871,1,0.0028791,">Malvaceae;_Waltheria_virgata_[uwaid:22557]_[length:159276]"],
		[876,862,0,0.00095023,""],
		[877,876,0,0.0033645,""],
		[878,877,0,0.0017389,""],
		[879,878,0,0.00039829,""],
		[880,879,0,0.00027191,""],
		[881,880,0,0.000080704,""],
		[882,881,0,0.0002078,""],
		[883,882,0,0.000077125,""],
		[884,883,0,0.000060468,""],
		[885,884,0,0.000061437,""],
		[886,885,0,0.000033961,""],
		[887,886,1,0.00013065,">Malvaceae;_Corchorus_lasiocarpus_subsp._lasiocarpus_[uwaid:33483]_[length:164772]"],
		[888,886,1,0.00017491,">Malvaceae;_Corchorus_laniflorus_[uwaid:22555]_[length:165333]"],
		[889,885,1,0.00019248,">Malvaceae;_Corchorus_walcottii_[uwaid:22482]_[length:165891]"],
		[890,884,1,0.00016355,">Malvaceae;_Corchorus_parviflorus_[uwaid:33603]_[length:161001]"],
		[891,883,1,0.00039128,">Malvaceae;_Corchorus_incanus_subsp._incanus_[uwaid:22509]_[length:166134]"],
		[892,882,1,0.00022916,">Malvaceae;_Corchorus_elachocarpus_[uwaid:33601]_[length:157647]"],
		[893,881,1,0.00053255,">Malvaceae;_Corchorus_lasiocarpus_subsp._parvus_[uwaid:22511]_[length:161427]"],
		[894,880,0,0.00033031,""],
		[895,894,1,0.00087378,">Malvaceae;_Corchorus_tectus_[uwaid:33623]_[length:161004]"],
		[896,894,1,0.00053416,">Malvaceae;_Corchorus_sidoides_subsp._vermicularis_[uwaid:22483]_[length:165196]"],
		[897,879,1,0.00096204,">Malvaceae;_Corchorus_crozophorifolius_[uwaid:22485]_[length:166045]"],
		[898,878,1,0.0020101,">Malvaceae;_Corchorus_trilocularis_[uwaid:33645]_[length:162204]"],
		[899,877,1,0.0028225,">Malvaceae;_Corchorus_tridens_[uwaid:33602]_[length:162540]"],
		[900,876,0,0.0052671,""],
		[901,900,0,0.00048647,""],
		[902,901,0,0.00059592,""],
		[903,902,0,0.00035188,""],
		[904,903,0,0.00089382,""],
		[905,904,1,0.0011397,">Malvaceae;_Triumfetta_johnstonii_[uwaid:33532]_[length:161328]"],
		[906,904,1,0.0011268,">Malvaceae;_Triumfetta_clementii_[uwaid:33531]_[length:149067]"],
		[907,903,1,0,">Malvaceae;_Triumfetta_chaetocarpa_[uwaid:22499]_[length:158112]"],
		[908,902,1,0,">Malvaceae;_Triumfetta_ramosa_[uwaid:22558]_[length:161766]"],
		[909,901,0,0.0022141,""],
		[910,909,1,0.0041477,">Malvaceae;_Triumfetta_leptacantha_[uwaid:22504]_[length:28439]"],
		[911,909,1,0.000075533,">Malvaceae;_Triumfetta_appendiculata_[uwaid:22497]_[length:24676]"],
		[912,900,1,0.00072867,">Malvaceae;_Triumfetta_maconochieana_[uwaid:33600]_[length:160073]"],
		[913,861,0,0.00052035,""],
		[914,913,0,0.0010469,""],
		[915,914,0,0.00046426,""],
		[916,915,0,0.00031598,""],
		[917,916,0,0.0020746,""],
		[918,917,0,0.0014157,""],
		[919,918,0,0.0012041,""],
		[920,919,1,0.000041298,">Malvaceae;_Hibiscus_panduriformis_[uwaid:33479]_[length:161210]"],
		[921,919,1,0.00020875,">Malvaceae;_Hibiscus_austrinus_var._austrinus_[uwaid:22498]_[length:164791]"],
		[922,918,1,0.001229,">Malvaceae;_Abelmoschus_ficulneus_[uwaid:33634]_[length:163201]"],
		[923,917,0,0.0018197,""],
		[924,923,0,0.00028916,""],
		[925,924,0,0.00050824,""],
		[926,925,0,0.000098341,""],
		[927,926,0,0.000080905,""],
		[928,927,1,0.00026634,">Malvaceae;_Hibiscus_sturtii_var._campylochlamys_[uwaid:33482]_[length:160487]"],
		[929,927,1,0.00020107,">Malvaceae;_Hibiscus_sturtii_var._truncatus_[uwaid:33480]_[length:160377]"],
		[930,926,1,0.00028657,">Malvaceae;_Hibiscus_sturtii_var._campylochlamys_[uwaid:22489]_[length:160387]"],
		[931,925,1,0.00043943,">Malvaceae;_Hibiscus_sturtii_var._platychlamys_[uwaid:33481]_[length:160569]"],
		[932,924,1,0.00077264,">Malvaceae;_Hibiscus_goldsworthii_[uwaid:33599]_[length:160374]"],
		[933,923,0,0.00034536,""],
		[934,933,0,0.00006879,""],
		[935,934,0,0.000062864,""],
		[936,935,0,0.000062808,""],
		[937,936,0,0.00035259,""],
		[938,937,1,0.000059594,">Malvaceae;_Hibiscus_coatesii_[uwaid:33598]_[length:160327]"],
		[939,937,1,0.00013314,">Malvaceae;_Hibiscus_sp._Gardneri_[uwaid:22469]_[length:161207]"],
		[940,936,1,0.00043599,">Malvaceae;_Hibiscus_brachysiphonius_[uwaid:22556]_[length:159965]"],
		[941,935,1,0.00051528,">Malvaceae;_Hibiscus_leptocladus_[uwaid:22494]_[length:159904]"],
		[942,934,1,0.00068003,">Malvaceae;_Hibiscus_burtonii_[uwaid:33597]_[length:160185]"],
		[943,933,1,0.00077296,">Malvaceae;_Hibiscus_campanulatus_[uwaid:33446]_[length:160245]"],
		[944,916,0,0.0032084,""],
		[945,944,1,0.0010355,">Malvaceae;_Gossypium_robinsonii_[uwaid:22506]_[length:161371]"],
		[946,944,1,0.00098186,">Malvaceae;_Gossypium_australe_[uwaid:22505]_[length:159720]"],
		[947,915,1,0.0038544,">Malvaceae;_Brachychiton_gregorii_[uwaid:33476]_[length:161145]"],
		[948,914,0,0.00047103,""],
		[949,948,0,0.0016786,""],
		[950,949,0,0.00044594,""],
		[951,950,0,0.0022833,""],
		[952,951,0,0.0001149,""],
		[953,952,0,0.000064285,""],
		[954,953,0,0.00011013,""],
		[955,954,0,0.000052261,""],
		[956,955,1,0.0003466,">Malvaceae;_Sida_ectogama_[uwaid:33552]_[length:160474]"],
		[957,955,1,0.00040713,">Malvaceae;_Sida_cardiophylla_[uwaid:33550]_[length:160404]"],
		[958,954,1,0.0004006,">Malvaceae;_Sida_sp._spiciform_panicles_[uwaid:33555]_[length:160472]"],
		[959,953,0,0.00020178,""],
		[960,959,0,0.000029355,""],
		[961,960,0,0.000037194,""],
		[962,961,0,0.000029493,""],
		[963,962,0,0.000042562,""],
		[964,963,0,0.00003241,""],
		[965,964,0,0.000065097,""],
		[966,965,0,0.000036965,""],
		[967,966,1,0.000050586,">Malvaceae;_Sida_fibulifera_[uwaid:33556]_[length:160410]"],
		[968,966,1,0.00015405,">Malvaceae;_Sida_clementii_[uwaid:33551]_[length:160578]"],
		[969,965,1,0.000092483,">Malvaceae;_Sida_sp._verrucose_glands_[uwaid:33554]_[length:160338]"],
		[970,964,1,0.00013765,">Malvaceae;_Sida_sp._Articulation_below_[uwaid:33559]_[length:160384]"],
		[971,963,1,0.00018811,">Malvaceae;_Sida_platycalyx_[uwaid:33558]_[length:160436]"],
		[972,962,1,0.00023832,">Malvaceae;_Sida_trichopoda_[uwaid:33661]_[length:160261]"],
		[973,961,1,0.00027563,">Malvaceae;_Sida_sp._Pilbara_[uwaid:33630]_[length:160587]"],
		[974,960,1,0.00034183,">Malvaceae;_Sida_sp._Barlee_Range_[uwaid:33561]_[length:160607]"],
		[975,959,0,0.000079084,""],
		[976,975,1,0.00026392,">Malvaceae;_Sida_sp._Shovelanna_Hill_[uwaid:33562]_[length:160506]"],
		[977,975,1,0.00024614,">Malvaceae;_Sida_sp._dark_green_fruits_[uwaid:33557]_[length:160392]"],
		[978,952,0,0.00056165,""],
		[979,978,1,0.000031525,">Malvaceae;_Sida_arsiniata_[uwaid:33549]_[length:160374]"],
		[980,978,1,0.000026017,">Malvaceae;_Sida_echinocarpa_[uwaid:33456]_[length:160219]"],
		[981,951,1,0.00068706,">Malvaceae;_Sida_sp._Hamersley_Range_[uwaid:33457]_[length:160097]"],
		[982,950,0,0.0023163,""],
		[983,982,0,0.00034859,""],
		[984,983,0,0.00006735,""],
		[985,984,0,0.00008955,""],
		[986,985,0,0.000076416,""],
		[987,986,0,0.00015707,""],
		[988,987,1,0.000025464,">Malvaceae;_Abutilon_otocarpum_[uwaid:33647]_[length:160171]"],
		[989,987,1,0.000027151,">Malvaceae;_Abutilon_otocarpum_[uwaid:22496]_[length:160486]"],
		[990,986,1,0.00015942,">Malvaceae;_Abutilon_oxycarpum_subsp._Prostrate_[uwaid:22462]_[length:160483]"],
		[991,985,1,0.00025829,">Malvaceae;_Abutilon_macrum_[uwaid:22492]_[length:160287]"],
		[992,984,0,0.00027104,""],
		[993,992,1,0.0001519,">Malvaceae;_Abutilon_cunninghamii_[uwaid:22467]_[length:160253]"],
		[994,992,1,0.00013467,">Malvaceae;_Abutilon_amplum_[uwaid:22397]_[length:160475]"],
		[995,983,0,0.00017748,""],
		[996,995,1,0.00025487,">Malvaceae;_Abutilon_cryptopetalum_[uwaid:22502]_[length:160275]"],
		[997,995,1,0.00029046,">Malvaceae;_Abutilon_fraseri_[uwaid:22491]_[length:160079]"],
		[998,982,0,0.00057075,""],
		[999,998,0,0.000095126,""],
		[1000,999,0,0.000055748,""],
		[1001,1000,0,0.0000041514,""],
		[1002,1001,1,0.000042734,">Malvaceae;_Abutilon_sp._Pilbara_[uwaid:33648]_[length:159978]"],
		[1003,1001,1,0.000032581,">Malvaceae;_Abutilon_lepidum_[uwaid:22495]_[length:160147]"],
		[1004,1000,1,0.000033663,">Malvaceae;_Abutilon_sp._Pilbara_[uwaid:33539]_[length:160158]"],
		[1005,999,1,0.000068721,">Malvaceae;_Abutilon_sp._Pritzelianum_[uwaid:33449]_[length:159971]"],
		[1006,998,1,0.00019835,">Malvaceae;_Abutilon_sp._Dioicum_[uwaid:22465]_[length:160075]"],
		[1007,949,0,0.0020091,""],
		[1008,1007,1,0.0015699,">Malvaceae;_Sida_rohlenae_subsp._rohlenae_[uwaid:33560]_[length:160344]"],
		[1009,1007,1,0.0015666,">Malvaceae;_Sida_spinosa_[uwaid:33553]_[length:159789]"],
		[1010,948,1,0.0049173,">Malvaceae;_Lawrencia_densiflora_[uwaid:33477]_[length:159897]"],
		[1011,913,1,0.0065414,">Malvaceae;_Melhania_oblongifolia_[uwaid:33485]_[length:160919]"],
		[1012,846,0,0.013859,""],
		[1013,1012,1,0.0020562,">Lythraceae;_Ammannia_baccifera_[uwaid:33494]_[length:157997]"],
		[1014,1012,1,0.0021078,">Lythraceae;_Ammannia_multiflora_[uwaid:33493]_[length:157967]"],
		[1015,845,0,0.00071163,""],
		[1016,1015,0,0.00032255,""],
		[1017,1016,0,0.0097446,""],
		[1018,1017,0,0.0011163,""],
		[1019,1018,0,0.0026758,""],
		[1020,1019,0,0.00083092,""],
		[1021,1020,0,0.00094336,""],
		[1022,1021,0,0.00033172,""],
		[1023,1022,0,0.00083406,""],
		[1024,1023,1,0,">Euphorbiaceae;_Euphorbia_vaccaria_subsp._vaccaria_[uwaid:33643]_[length:163482]"],
		[1025,1023,1,0.0011936,">Euphorbiaceae;_Euphorbia_australis_var._subtomentosa_[uwaid:22391]_[length:165595]"],
		[1026,1022,1,0,">Euphorbiaceae;_Euphorbia_drummondii_[uwaid:33671]_[length:163332]"],
		[1027,1021,1,0.00019975,">Euphorbiaceae;_Euphorbia_inappendiculata_var._queenslandica_[uwaid:22317]_[length:163339]"],
		[1028,1020,1,0.0011656,">Euphorbiaceae;_Euphorbia_clementii_[uwaid:22447]_[length:163854]"],
		[1029,1019,0,0.0018296,""],
		[1030,1029,0,0.00040121,""],
		[1031,1030,0,0.00017404,""],
		[1032,1031,1,0.00010235,">Euphorbiaceae;_Euphorbia_trigonosperma_[uwaid:33685]_[length:167721]"],
		[1033,1031,1,0.00010359,">Euphorbiaceae;_Euphorbia_biconvexa_[uwaid:33523]_[length:167619]"],
		[1034,1030,1,0.00026376,">Euphorbiaceae;_Euphorbia_trigonosperma_[uwaid:22388]_[length:167597]"],
		[1035,1029,1,0.00065848,">Euphorbiaceae;_Euphorbia_coghlanii_[uwaid:33525]_[length:167613]"],
		[1036,1018,1,0.0039206,">Euphorbiaceae;_Euphorbia_tannensis_subsp._eremophila_[uwaid:22449]_[length:165643]"],
		[1037,1017,0,0.0019266,""],
		[1038,1037,1,0.0029621,">Euphorbiaceae;_Euphorbia_stevenii_[uwaid:33674]_[length:160265]"],
		[1039,1037,1,0.0031228,">Euphorbiaceae;_Euphorbia_boophthona_[uwaid:33524]_[length:159133]"],
		[1040,1016,0,0.014281,""],
		[1041,1040,0,0.00091714,""],
		[1042,1041,1,0.000073073,">Oxalidaceae;_Oxalis_perennans_[uwaid:33578]_[length:152258]"],
		[1043,1041,1,0.000072149,">Oxalidaceae;_Oxalis_sp._Pilbara_[uwaid:33564]_[length:152251]"],
		[1044,1040,1,0.00029284,">Oxalidaceae;_Oxalis_corniculata_[uwaid:33563]_[length:152381]"],
		[1045,1015,0,0.0033261,""],
		[1046,1045,0,0.020254,""],
		[1047,1046,1,0.00052677,">Polygalaceae;_Polygala_isingii_[uwaid:33676]_[length:164788]"],
		[1048,1046,1,0.00050589,">Polygalaceae;_Polygala_glaucifolia_[uwaid:33654]_[length:163845]"],
		[1049,1045,0,0.00075823,""],
		[1050,1049,1,0.010663,">Surianaceae;_Stylobasium_spathulatum_[uwaid:33639]_[length:156914]"],
		[1051,1049,0,0.0010174,""],
		[1052,1051,0,0.0024528,""],
		[1053,1052,0,0.00039351,""],
		[1054,1053,0,0.00080625,""],
		[1055,1054,0,0.00039296,""],
		[1056,1055,0,0.00044716,""],
		[1057,1056,0,0.00065572,""],
		[1058,1057,0,0.00062627,""],
		[1059,1058,1,0.01598,">Fabaceae;_Lotus_cruentus_[uwaid:22431]_[length:151167]"],
		[1060,1058,1,0.011225,">Fabaceae;_Sesbania_cannabina_[uwaid:22430]_[length:158167]"],
		[1061,1057,0,0.022048,""],
		[1062,1061,0,0.00026174,""],
		[1063,1062,0,0.00014607,""],
		[1064,1063,0,0.00013388,""],
		[1065,1064,1,0.0031576,">Fabaceae;_Swainsona_laciniata_[uwaid:33547]_[length:123142]"],
		[1066,1064,1,0.0032749,">Fabaceae;_Swainsona_thompsoniana_[uwaid:33543]_[length:123661]"],
		[1067,1063,1,0.003399,">Fabaceae;_Swainsona_formosa_[uwaid:22412]_[length:122887]"],
		[1068,1062,1,0.0035681,">Fabaceae;_Swainsona_pterostylis_[uwaid:22371]_[length:122968]"],
		[1069,1061,1,0.0037646,">Fabaceae;_Swainsona_kingii_[uwaid:22366]_[length:123706]"],
		[1070,1056,0,0.0019673,""],
		[1071,1070,0,0.0044324,""],
		[1072,1071,0,0.00040516,""],
		[1073,1072,0,0.0083217,""],
		[1074,1073,0,0.0037449,""],
		[1075,1074,1,0,">Fabaceae;_Desmodium_muelleri_[uwaid:22360]_[length:148219]"],
		[1076,1074,1,0.00051679,">Fabaceae;_Desmodium_filiforme_[uwaid:22359]_[length:148244]"],
		[1077,1073,1,0.0036043,">Fabaceae;_Alysicarpus_muelleri_[uwaid:33689]_[length:149637]"],
		[1078,1072,1,0.011082,">Fabaceae;_Rhynchosia_minima_[uwaid:22367]_[length:152896]"],
		[1079,1071,0,0.0017022,""],
		[1080,1079,0,0.001111,""],
		[1081,1080,0,0.0038939,""],
		[1082,1081,0,0.0037933,""],
		[1083,1082,0,0.0011228,""],
		[1084,1083,0,0.0000027796,""],
		[1085,1084,1,0.0000028339,">Amaranthaceae;_Gomphrena_kanisii_[uwaid:33587]_[length:152662]"],
		[1086,1084,1,0.0000028749,">Amaranthaceae;_Gomphrena_canescens_subsp._canescens_[uwaid:33527]_[length:152663]"],
		[1087,1083,1,0.000005853,">Fabaceae;_Glycine_canescens_[uwaid:33566]_[length:152661]"],
		[1088,1082,1,0.0012989,">Fabaceae;_Glycine_falcata_[uwaid:22553]_[length:152979]"],
		[1089,1081,0,0.0039385,""],
		[1090,1089,0,0.00014936,""],
		[1091,1090,0,0.00031607,""],
		[1092,1091,1,0.0005496,">Fabaceae;_Cullen_graveolens_[uwaid:33646]_[length:145308]"],
		[1093,1091,1,0.000037461,">Fabaceae;_Cullen_cinereum_[uwaid:22394]_[length:150658]"],
		[1094,1090,1,0.00024865,">Fabaceae;_Cullen_pogonocarpum_[uwaid:33624]_[length:152780]"],
		[1095,1089,0,0.00038952,""],
		[1096,1095,0,0.000028724,""],
		[1097,1096,0,0.00045184,""],
		[1098,1097,0,0.000058373,""],
		[1099,1098,1,0.00014982,">Fabaceae;_Cullen_stipulaceum_[uwaid:33506]_[length:145308]"],
		[1100,1098,1,0.00013724,">Fabaceae;_Cullen_lachnostachys_[uwaid:33505]_[length:145293]"],
		[1101,1097,1,0.00020918,">Fabaceae;_Cullen_leucochaites_[uwaid:22370]_[length:145249]"],
		[1102,1096,1,0.000052663,">Fabaceae;_Cullen_martinii_[uwaid:22411]_[length:150863]"],
		[1103,1095,1,0.000076397,">Fabaceae;_Cullen_leucanthum_[uwaid:22395]_[length:150841]"],
		[1104,1080,0,0.0088589,""],
		[1105,1104,0,0.00090544,""],
		[1106,1105,0,0.00019749,""],
		[1107,1106,1,0.00007452,">Fabaceae;_Vigna_sp._Hammersley_Clay_[uwaid:33679]_[length:151314]"],
		[1108,1106,1,0.000082853,">Fabaceae;_Vigna_sp._Hamersley_Clay_[uwaid:22356]_[length:151352]"],
		[1109,1105,1,0.00027334,">Fabaceae;_Vigna_triodiophila_[uwaid:33542]_[length:151262]"],
		[1110,1104,1,0.0056515,">Fabaceae;_Vigna_lanceolata_var._lanceolata_[uwaid:33526]_[length:69396]"],
		[1111,1079,1,0.009853,">Fabaceae;_Erythrina_vespertilio_[uwaid:33508]_[length:152093]"],
		[1112,1070,0,0.013942,""],
		[1113,1112,0,0.0014881,""],
		[1114,1113,0,0.00041187,""],
		[1115,1114,1,0.00068694,">Fabaceae;_Tephrosia_sp._Bungaroo_Creek_[uwaid:33568]_[length:153127]"],
		[1116,1114,1,0.00074279,">Fabaceae;_Tephrosia_virens_[uwaid:22364]_[length:152929]"],
		[1117,1113,0,0.00053485,""],
		[1118,1117,0,0.00023264,""],
		[1119,1118,0,0.000039535,""],
		[1120,1119,0,0.00012631,""],
		[1121,1120,1,0.00011292,">Fabaceae;_Tephrosia_sp._NW_Eremaea_[uwaid:33631]_[length:152397]"],
		[1122,1120,1,0.00017995,">Fabaceae;_Tephrosia_oxalidea_[uwaid:33572]_[length:150116]"],
		[1123,1119,1,0.00030254,">Fabaceae;_Tephrosia_clementii_[uwaid:33571]_[length:150129]"],
		[1124,1118,1,0.00027111,">Fabaceae;_Tephrosia_sp._Fortescue_[uwaid:33570]_[length:152722]"],
		[1125,1117,1,0.00051622,">Fabaceae;_Tephrosia_sp._Clay_soils_[uwaid:33636]_[length:152631]"],
		[1126,1112,0,0.0020142,""],
		[1127,1126,0,0.00042515,""],
		[1128,1127,0,0.00020581,""],
		[1129,1128,1,0.00011287,">Fabaceae;_Tephrosia_rosea_[uwaid:33567]_[length:153049]"],
		[1130,1128,1,0.00025022,">Fabaceae;_Tephrosia_rosea_var._Fortescue_[uwaid:22365]_[length:149160]"],
		[1131,1127,1,0.00029312,">Fabaceae;_Tephrosia_supina_[uwaid:33515]_[length:150819]"],
		[1132,1126,1,0.00065296,">Fabaceae;_Tephrosia_rosea_var._clementii_[uwaid:33569]_[length:153156]"],
		[1133,1055,0,0.0015036,""],
		[1134,1133,0,0.00098576,""],
		[1135,1134,0,0.0084729,""],
		[1136,1135,1,0.0075757,">Fabaceae;_Gastrolobium_grandiflorum_[uwaid:33507]_[length:150504]"],
		[1137,1135,1,0.0069326,">Fabaceae;_Mirbelia_viminalis_[uwaid:33462]_[length:151526]"],
		[1138,1134,0,0.016998,""],
		[1139,1138,1,0.00097859,">Fabaceae;_Isotropis_forrestii_[uwaid:22407]_[length:166232]"],
		[1140,1138,1,0.0010506,">Fabaceae;_Isotropis_atropurpurea_[uwaid:22406]_[length:166818]"],
		[1141,1133,0,0.015606,""],
		[1142,1141,0,0.00015976,""],
		[1143,1142,1,0.00013349,">Fabaceae;_Gompholobium_polyzygum_[uwaid:33546]_[length:162301]"],
		[1144,1142,1,0.00013785,">Fabaceae;_Gompholobium_oreophilum_[uwaid:22358]_[length:162279]"],
		[1145,1141,1,0.00032704,">Fabaceae;_Gompholobium_karijini_[uwaid:22429]_[length:162496]"],
		[1146,1054,0,0.0058603,""],
		[1147,1146,0,0.00047583,""],
		[1148,1147,0,0.0013315,""],
		[1149,1148,0,0.0001502,""],
		[1150,1149,0,0.00022558,""],
		[1151,1150,0,0.0010044,""],
		[1152,1151,1,0.00022559,">Fabaceae;_Indigofera_fractiflexa_subsp._fractiflexa_[uwaid:33577]_[length:159385]"],
		[1153,1151,1,0.00024391,">Fabaceae;_Indigofera_fractiflexa_subsp._fractiflexa_[uwaid:33497]_[length:159399]"],
		[1154,1150,1,0.0012725,">Fabaceae;_Indigofera_boviperda_[uwaid:22361]_[length:158531]"],
		[1155,1149,1,0.00089668,">Fabaceae;_Indigofera_gilesii_[uwaid:33574]_[length:158264]"],
		[1156,1148,0,0.001152,""],
		[1157,1156,1,0.00048667,">Fabaceae;_Indigofera_sp._Bungaroo_Creek_[uwaid:22393]_[length:158921]"],
		[1158,1156,1,0.00056823,">Fabaceae;_Indigofera_monophylla_[uwaid:22392]_[length:156554]"],
		[1159,1147,1,0.0027109,">Fabaceae;_Indigofera_colutea_[uwaid:33513]_[length:157461]"],
		[1160,1146,0,0.001188,""],
		[1161,1160,0,0.0003617,""],
		[1162,1161,1,0.0019046,">Fabaceae;_Indigofera_trita_[uwaid:33514]_[length:156802]"],
		[1163,1161,1,0.0032736,">Fabaceae;_Indigofera_linnaei_[uwaid:22417]_[length:152522]"],
		[1164,1160,1,0.0025965,">Fabaceae;_Indigofera_linifolia_[uwaid:22405]_[length:160084]"],
		[1165,1053,1,0.013872,">Fabaceae;_Zornia_muelleriana_subsp._congesta_[uwaid:33504]_[length:148339]"],
		[1166,1052,0,0.012582,""],
		[1167,1166,0,0.00023746,""],
		[1168,1167,1,0.0025595,">Fabaceae;_Crotalaria_medicaginea_var._neglecta_[uwaid:33510]_[length:152827]"],
		[1169,1167,1,0.00245,">Fabaceae;_Crotalaria_dissitiflora_subsp._benthamiana_[uwaid:33509]_[length:153194]"],
		[1170,1166,0,0.0013007,""],
		[1171,1170,0,0.00014186,""],
		[1172,1171,0,0.0010085,""],
		[1173,1172,1,0.00031525,">Fabaceae;_Crotalaria_novae-hollandiae_subsp._novae-hollandiae_[uwaid:33512]_[length:153466]"],
		[1174,1172,1,0.00031823,">Fabaceae;_Crotalaria_cunninghamii_subsp._sturtii_[uwaid:22530]_[length:153594]"],
		[1175,1171,1,0.0014571,">Fabaceae;_Crotalaria_ramosissima_[uwaid:33511]_[length:152299]"],
		[1176,1170,1,0.0016503,">Fabaceae;_Crotalaria_juncea_[uwaid:33633]_[length:152722]"],
		[1177,1051,0,0.0010909,""],
		[1178,1177,1,0.0081134,">Fabaceae;_Petalostylis_labicheoides_[uwaid:22413]_[length:159105]"],
		[1179,1177,0,0.0020662,""],
		[1180,1179,0,0.0016819,""],
		[1181,1180,0,0.0022466,""],
		[1182,1181,0,0.00011326,""],
		[1183,1182,0,0.00078527,""],
		[1184,1183,0,0.00011989,""],
		[1185,1184,1,0.00014489,">Fabaceae;_Senna_glutinosa_subsp._luerssenii_[uwaid:33629]_[length:160224]"],
		[1186,1184,1,0.00021705,">Fabaceae;_Senna_glutinosa_subsp._pruinosa_[uwaid:22540]_[length:161638]"],
		[1187,1183,1,0.00029405,">Fabaceae;_Senna_stricta_[uwaid:22539]_[length:156740]"],
		[1188,1182,1,0.0015354,">Fabaceae;_Senna_artemisioides_subsp._petiolaris_[uwaid:33687]_[length:160173]"],
		[1189,1181,0,0.00096787,""],
		[1190,1189,0,0.00011551,""],
		[1191,1190,0,0.000023769,""],
		[1192,1191,0,0.00011339,""],
		[1193,1192,0,0.00015669,""],
		[1194,1193,1,0.0000074492,">Fabaceae;_Senna_aff._hamersleyensis_[uwaid:33677]_[length:160257]"],
		[1195,1193,1,0.000016278,">Fabaceae;_Senna_sp._Karijini_[uwaid:33573]_[length:160089]"],
		[1196,1192,1,0.00018415,">Fabaceae;_Senna_artemisioides_subsp._helmsii_[uwaid:22534]_[length:160147]"],
		[1197,1191,1,0.00029071,">Fabaceae;_Senna_hamersleyensis_[uwaid:33520]_[length:160474]"],
		[1198,1190,0,0.00016392,""],
		[1199,1198,0,0.000011414,""],
		[1200,1199,1,0.00014604,">Fabaceae;_Senna_ferraria_[uwaid:33664]_[length:159858]"],
		[1201,1199,1,0.00014878,">Fabaceae;_Senna_artemisioides_subsp._oligophylla_[uwaid:33519]_[length:160043]"],
		[1202,1198,1,0.00016852,">Fabaceae;_Senna_ferraria_[uwaid:33662]_[length:159828]"],
		[1203,1189,1,0.00058865,">Fabaceae;_Senna_ferraria_[uwaid:33663]_[length:160001]"],
		[1204,1180,1,0.003093,">Fabaceae;_Senna_notabilis_[uwaid:22537]_[length:158062]"],
		[1205,1179,0,0.0027902,""],
		[1206,1205,1,0.0033451,">Fabaceae;_Vachellia_farnesiana_[uwaid:33637]_[length:165996]"],
		[1207,1205,0,0.000085987,""],
		[1208,1207,1,0.0029614,">Fabaceae;_Neptunia_dimorphantha_[uwaid:22369]_[length:162339]"],
		[1209,1207,0,0.0033372,""],
		[1210,1209,0,0.00061073,""],
		[1211,1210,0,0.0018999,""],
		[1212,1211,1,0.00060263,">Fabaceae;_Acacia_adoxa_var._adoxa_[uwaid:22531]_[length:174125]"],
		[1213,1211,1,0.00059569,">Fabaceae;_Acacia_spondylophylla_[uwaid:22425]_[length:174794]"],
		[1214,1210,0,0.0019595,""],
		[1215,1214,0,0.00072547,""],
		[1216,1215,0,0.000029669,""],
		[1217,1216,1,0.000065901,">Fabaceae;_Acacia_ligulata_[uwaid:33649]_[length:172790]"],
		[1218,1216,1,0.000084801,">Fabaceae;_Acacia_bivenosa_[uwaid:22421]_[length:173282]"],
		[1219,1215,1,0.00022854,">Fabaceae;_Acacia_sclerosperma_subsp._sclerosperma_[uwaid:22374]_[length:169927]"],
		[1220,1214,1,0.00075186,">Fabaceae;_Acacia_ampliceps_[uwaid:22408]_[length:172980]"],
		[1221,1209,0,0.000099989,""],
		[1222,1221,0,0.00010131,""],
		[1223,1222,0,0.00078231,""],
		[1224,1223,0,0.0013854,""],
		[1225,1224,0,0.0011963,""],
		[1226,1225,1,0.00038301,">Fabaceae;_Acacia_pyrifolia_var._morrisonii_[uwaid:33681]_[length:173581]"],
		[1227,1225,1,0.00028954,">Fabaceae;_Acacia_pyrifolia_var._pyrifolia_[uwaid:22378]_[length:175586]"],
		[1228,1224,0,0.0013884,""],
		[1229,1228,1,0.00023561,">Fabaceae;_Acacia_trudgeniana_[uwaid:22363]_[length:173497]"],
		[1230,1228,1,0.00023325,">Fabaceae;_Acacia_inaequilatera_[uwaid:22362]_[length:172912]"],
		[1231,1223,0,0.0017904,""],
		[1232,1231,1,0.00033379,">Fabaceae;_Acacia_synchronicia_[uwaid:33594]_[length:175188]"],
		[1233,1231,1,0.00045683,">Fabaceae;_Acacia_glaucocaesia_[uwaid:33565]_[length:175773]"],
		[1234,1222,1,0.0034356,">Fabaceae;_Acacia_maitlandii_[uwaid:33500]_[length:175222]"],
		[1235,1221,0,0.00035156,""],
		[1236,1235,1,0.0023112,">Fabaceae;_Acacia_pachyacra_[uwaid:33665]_[length:173057]"],
		[1237,1235,0,0.00019262,""],
		[1238,1237,0,0.00010391,""],
		[1239,1238,0,0.000032907,""],
		[1240,1239,0,0.0021344,""],
		[1241,1240,1,0.00055718,">Fabaceae;_Acacia_dictyophleba_[uwaid:22420]_[length:177475]"],
		[1242,1240,1,0.00062507,">Fabaceae;_Acacia_sabulosa_[uwaid:22357]_[length:176718]"],
		[1243,1239,1,0.002161,">Fabaceae;_Acacia_tetragonophylla_[uwaid:33544]_[length:174744]"],
		[1244,1238,0,0.00019845,""],
		[1245,1244,1,0.0016709,">Fabaceae;_Acacia_pruinocarpa_[uwaid:33593]_[length:177817]"],
		[1246,1244,1,0.0026366,">Fabaceae;_Acacia_retivenea_subsp._clandestina_[uwaid:22410]_[length:173369]"],
		[1247,1237,0,0.00014973,""],
		[1248,1247,0,0.0011452,""],
		[1249,1248,1,0.00022109,">Fabaceae;_Acacia_coriacea_subsp._pendens_[uwaid:22423]_[length:176906]"],
		[1250,1248,1,0.00026516,">Fabaceae;_Acacia_sericophylla_[uwaid:22377]_[length:177008]"],
		[1251,1247,0,0.00021154,""],
		[1252,1251,1,0.001359,">Fabaceae;_Acacia_xiphophylla_[uwaid:33503]_[length:178133]"],
		[1253,1251,0,0.00018348,""],
		[1254,1253,0,0.00013239,""],
		[1255,1254,0,0.000029134,""],
		[1256,1255,1,0.00067685,">Fabaceae;_Acacia_hamersleyensis_[uwaid:33499]_[length:174115]"],
		[1257,1255,1,0.00075504,">Fabaceae;_Acacia_exigua_[uwaid:22434]_[length:173303]"],
		[1258,1254,0,0.00010799,""],
		[1259,1258,0,0.000044136,""],
		[1260,1259,0,0.00020286,""],
		[1261,1260,0,0.00049976,""],
		[1262,1261,1,0.000046882,">Fabaceae;_Acacia_sclerosperma_subsp._sclerosperma_[uwaid:33608]_[length:176366]"],
		[1263,1261,1,0.000061881,">Fabaceae;_Acacia_tumida_var._pilbarensis_[uwaid:22527]_[length:177397]"],
		[1264,1260,1,0.00071231,">Fabaceae;_Acacia_eriopoda_[uwaid:22436]_[length:176107]"],
		[1265,1259,1,0.00063894,">Fabaceae;_Acacia_bromilowiana_[uwaid:33545]_[length:174270]"],
		[1266,1258,0,0.00050562,""],
		[1267,1266,0,0.00039873,""],
		[1268,1267,1,0.00049554,">Fabaceae;_Acacia_effusa_[uwaid:33541]_[length:176642]"],
		[1269,1267,1,0.00042429,">Fabaceae;_Acacia_trachycarpa_[uwaid:22368]_[length:177082]"],
		[1270,1266,1,0.00091093,">Fabaceae;_Acacia_monticola_[uwaid:22426]_[length:176089]"],
		[1271,1253,0,0.00013636,""],
		[1272,1271,0,0.000045369,""],
		[1273,1272,0,0.00040017,""],
		[1274,1273,0,0.000079289,""],
		[1275,1274,0,0.00017446,""],
		[1276,1275,1,0.0013151,">Fabaceae;_Acacia_ancistrocarpa_[uwaid:22427]_[length:176928]"],
		[1277,1275,1,0.00065399,">Fabaceae;_Acacia_hilliana_[uwaid:22419]_[length:173707]"],
		[1278,1274,0,0.00067754,""],
		[1279,1278,1,0.00018016,">Fabaceae;_Acacia_orthocarpa_[uwaid:33501]_[length:176293]"],
		[1280,1278,1,0.00018617,">Fabaceae;_Acacia_arida_[uwaid:22422]_[length:173714]"],
		[1281,1273,0,0.00097474,""],
		[1282,1281,1,0.000014537,">Fabaceae;_Acacia_sphaerostachya_[uwaid:22418]_[length:175852]"],
		[1283,1281,1,0.000078145,">Fabaceae;_Acacia_stellaticeps_[uwaid:22373]_[length:176324]"],
		[1284,1272,0,0.0010777,""],
		[1285,1284,0,0.0000574,""],
		[1286,1285,1,0.000061356,">Fabaceae;_Acacia_elachantha_[uwaid:33548]_[length:175432]"],
		[1287,1285,1,0.000085246,">Fabaceae;_Acacia_colei_var._colei_[uwaid:22525]_[length:175798]"],
		[1288,1284,1,0.00011047,">Fabaceae;_Acacia_cowleana_[uwaid:33498]_[length:175324]"],
		[1289,1271,0,0.00013562,""],
		[1290,1289,1,0.00093461,">Fabaceae;_Acacia_tenuissima_[uwaid:22375]_[length:177181]"],
		[1291,1289,0,0.00018559,""],
		[1292,1291,0,0.00004225,""],
		[1293,1292,0,0.000039537,""],
		[1294,1293,0,0.000064235,""],
		[1295,1294,1,0.00041197,">Fabaceae;_Acacia_kempeana_[uwaid:33592]_[length:175103]"],
		[1296,1294,1,0.00030596,">Fabaceae;_Acacia_sibirica_[uwaid:22376]_[length:176924]"],
		[1297,1293,1,0.00053478,">Fabaceae;_Acacia_rhodophloia_[uwaid:33502]_[length:177730]"],
		[1298,1292,0,0.00039791,""],
		[1299,1298,0,0.00012864,""],
		[1300,1299,1,0.000055379,">Fabaceae;_Acacia_sp._[uwaid:33651]_[length:174863]"],
		[1301,1299,1,0.000061711,">Fabaceae;_Acacia_atkinsiana_[uwaid:22433]_[length:177679]"],
		[1302,1298,1,0.00024425,">Fabaceae;_Acacia_adsurgens_[uwaid:22409]_[length:170526]"],
		[1303,1291,0,0.00010777,""],
		[1304,1303,0,0.00016925,""],
		[1305,1304,1,0.00016199,">Fabaceae;_Acacia_aneura_[uwaid:33812]_[length:174476]"],
		[1306,1304,1,0.00013761,">Fabaceae;_Acacia_aptaneura_[uwaid:33576]_[length:174493]"],
		[1307,1303,0,0.00001584,""],
		[1308,1307,1,0.00033841,">Fabaceae;_Acacia_ayersiana_[uwaid:33517]_[length:176324]"],
		[1309,1307,0,0.00002196,""],
		[1310,1309,0,0.00031846,""],
		[1311,1310,1,0.000034381,">Fabaceae;_Acacia_citrinoviridis_[uwaid:22424]_[length:177518]"],
		[1312,1310,1,0.000072582,">Fabaceae;_Acacia_distans_[uwaid:22404]_[length:173216]"],
		[1313,1309,0,0.000016821,""],
		[1314,1313,1,0.00032774,">Fabaceae;_Acacia_paraneura_[uwaid:22435]_[length:174348]"],
		[1315,1313,1,0.00042864,">Fabaceae;_Acacia_aneura_[uwaid:22528]_[length:179068]"],
		[1316,0,1,0.04346535,">RANDOM_OUTGROUP_[length:150000]"]
	];

	// build basic tree from a table of data
	function build_tree_from_table(table)
	{
		let nodes = [];
		let root = null;

		// create objects for all the nodes
		for (let [id,pid,leaf,distance,label] of table)
		{
			let node = {
				id : id,
				parent : pid,
				leaf : leaf == 1,
				distance : distance,
				label : label || ''
			};
			console.assert(nodes[node.id] === undefined);
			nodes[node.id] = node;
		}

		// connect up all the nodes to their parent nodes (and parents to child nodes)
		for (let node of nodes) {
			if (node.id == 0) {
				console.assert(root === null);
				root = node;
				node.parent = null;
			}
			else {
				let parent = nodes[node.parent];
				console.assert(parent !== undefined);
				node.parent = parent;
				if (parent.children == undefined) parent.children = [];
				parent.children.push(node);
			}
		}
		return root;
	}

	// the tree component
	function Tree(canvas,user_opts,data)
	{
		if (this.constructor != Tree) return new Tree(canvas,user_opts,data);

		// add events
		let self = this;
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
			leaf_font_size : 12,
			leaf_padding : 1,
			leaf_color : 'black',
			leaf_highlight_color : 'lightgreen',
			node_radius : 4,
			node_color : 'black',
			line_color : 'black',
			line_highlight_color : 'red',
			line_thickness : 1
		};
		let opts = Object.assign(default_opts, user_opts || {});

		// bind the canvas
		let fab = new fabric.Canvas(canvas);
		fab.renderOnAddRemove = false; // IMPORTANT!!

		// build the tree from the provided data
		if (!data) data = treedata;
		let root = build_tree_from_table(data);

		// other state params
		let dirty = true;
		let leaf_height = 0; // set in build_fabric_objects
		let leaf_left = 0;
		let leaves = [];

		// build the fabric.js objects and attach them to the tree
		function build_fabric_objects()
		{
			walk_df(root, node =>
			{
				if (node.parent === null) {
					node.depth = 0;
					node.total_distance = 0;
					console.assert(node === root);
				}
				else {
					node.depth = node.parent.depth + 1;
					node.total_distance = node.distance + node.parent.total_distance;
				}
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
						strokeWidth : opts.line_thickness,
						selectable : false
					});

					// add to the canvas
					fab.add(node.textbox);
					fab.add(node.upline);

					// make a note of leaf height
					if (!leaf_height) leaf_height = node.textbox.getHeight();

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
						strokeWidth : opts.line_thickness,
						selectable : false
					});

					// add to the canvas
					fab.add(node.dot);
					fab.add(node.upline);
					fab.add(node.spanline);
				}
			});
			let w = calculate_width();
			let h = calculate_height();
			recompute();
			resize(w,h); // automatically calls renderAll
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

		// the height of the canvas depends on the number of leaves, label size and spacing
		function calculate_height() {
			leaf_height = leaves[0].textbox.getHeight();
			return leaves.length * leaves[0].textbox.getHeight();
		}

		// resize the canvas so that it can fit the tree. NOTE: automatically calls renderAll()
		function resize(w,h) {
			fab.setDimensions({
				width : Math.round(w),
				height : Math.round(h)
			});
		}

		// mouse down handler for a leaf
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
			fab.renderAll();
		}

		// make a node smaller when the mouse leaves it
		function on_node_out (node) {
			node.dot.set('radius',node.dot.get('radius') - 2);
			fab.renderAll();
		}

		// double click a node to collapse / expand, single click to highlight
		function on_node_down(node)
		{
			// toggle visibility on a double click
			if (on_node_down.clicker != null)
			{
				//set_subtree_visibility(node,!node.visible);
				set_subtree_visibility(node,true);
				clearTimeout(on_node_down.clicker);
				// self.fire('node:collapse',node);
				self.fire('node:expand',node);
			}

			// toggle the highlight of a subtree on a single click
			else {
				on_node_down.clicker = setTimeout(() => {
					on_node_down.clicker = null;
					if (!node.selected) {
						node.selected = true;
						set_subtree_color(node, opts.line_highlight_color);
						self.fire('node:select',node);
					}
					else {
						node.selected = false;
						set_subtree_color(node, opts.line_color);
						self.fire('node:unselect',node);
					}
				},200);
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

			walk_df(root, node => { if (node.leaf && node.visible) leaves.push(node); });
			walk_bf(root, node => { if (!node.leaf && node.visible) nodes.push(node); });

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
					leaf.upline.set({ x1:x1, x2:x2, y1:y1+half_height, y2:y1+half_height, stroke:opts.line_color, strokeWidth : opts.line_thickness });
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

					node.upline.set({ x1:x1, x2:x2, y1:ymid, y2:ymid, stroke:opts.line_color, strokeWidth : opts.line_thickness });
					node.spanline.set({ x1:x2, x2:x2, y1:y1, y2:y2, stroke:opts.line_color, strokeWidth : opts.line_thickness });
					node.dot.set({ left:x2, top:ymid });
					node.dot.setCoords();
				}
			}
		}

		// set the colour of a subtree
		function set_subtree_color(start_node, color)
		{
			// convert positions from relative to absolute
			walk_df(start_node, node => {
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
			fab.renderAll();
		}

		// expand / collapse a subtree
		function set_subtree_visibility(node,state)
		{
			walk_df(node, n => {
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

		// build and render the initial tree
		build_fabric_objects();
	}

	// return the constructor for the tree
	return Tree;
}
