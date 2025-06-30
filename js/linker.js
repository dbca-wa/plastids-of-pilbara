function inject_content(placeholder)
{
	let link = document.createElement('link');
	link.rel = 'import';
	link.href = placeholder.getAttribute('src');
	link.onload = function(e) {
		for (let element of link.import.body.childNodes) {
			link.parentNode.insertBefore(element,link);
		}
		link.parentNode.removeChild(link);
	}
	link.onerror = function(e) {
		console.log('failed to import content',e);
		link.parentNode.removeChild(link);
	}
	placeholder.parentNode.replaceChild(link,placeholder);
}

function inject_all() {
	document.querySelectorAll('inject').forEach(tag => inject_content(tag));
}

function add_onload(handler) {
	addEventListener
	? window.addEventListener('load', handler)
	: window.attachEvent('onload', handler); //IE
}

// load single HTML nodes (with arbitrary content) from remote sources
function inject()
{
	let els = document.getElementsByTagName('inject');

	for (let i=0; i<els.length; ++i)
	{
		let el = els[i];
		let url = el.getAttribute('src');
		let jax = new XMLHttpRequest();
		jax.onreadystatechange = function() {
			if (jax.readyState == 4 && jax.status == 200)
			{
				// create the DOM structure under a temporary node
				let temp = document.createElement('div');
				temp.innerHTML = jax.responseText;

				// replace the injection point with the newly created outer node
				let fresh = temp.firstChild;
				el.parentNode.replaceChild(fresh,el);
				temp = null;

				// extract scripts from the new node
				let scripts = fresh.getElementsByTagName('script');

				// replace them with new copies to execute them
				for (let i=0; i<scripts.length; ++i) {
					replace_script(scripts[i]);
				}
			}
		}
		jax.open("GET", url, true);
		jax.send();
	}
}

// replace a script. This is useful to force (re)execution.
function replace_script(s_old)
{
	// a new script
	let s_new = document.createElement('script');

	// copy script attributes
	for (let i=0; i<s_old.attributes.length; ++i) {
		let a = s_old.attributes[i];
		s_new.setAttribute(a.name,a.value);
	}

	// copy script content
	s_new.textContent = s_old.textContent;

	// trigger execution by replacing old with new
	s_old.parentNode.replaceChild(s_new,s_old);
}

// initialise
add_onload(inject);
//add_onload(inject_all);
