/*

	# Day 151: 2015-Jun-01 (Mon): created [julian.tonti@gmail.com]

	A very simple mixin for adding events to any object. Do not target a prototype object unless
	you want the same events (and listeners) to be shared by all objects with that prototype.

	VARIABLES:

		events            : an object of the form { event_name : [listener functions in order of addition] }

	FUNCTIONS:

		on(name)          : assign the event name if it doesn't already exist
		on(name,func)     : as above then append another listener to that event (FIFO)

		un(name)          : remove the specific event and all listeners on it
		un(name,func)     : remove a specific listener on a specific event (LIFO)

		fire(name)        : call all listeners on a specific event
		fire(name,data)   : as above but call each listener with 'data' as the input parameter

		list()            : get a list of all event names
		list(name)        : get a list of all handlers on a specific event

		exists()          : always returns false
		exists(name)      : true if the specified event exists
		exists(name,func) : true if the specified handler exists on the specified event

*/

module.exports = function(target)
{
	if (target) return module.exports.call(target);

	for (var property of ['events','on','un','fire','list','exists']) {
		console.assert(this[property] === undefined, 'Mix-in failed because property "' + property + '" already exists');
	}

	this.events = {};

	this.on = function(name,handler) {
		if (name && !this.events[name]) this.events[name] = [];
		if (handler instanceof Function) this.events[name].push(handler);
		else return this.list(name);
	}
	this.un = function(name,handler) {
		if (!handler) delete this.events[name];
		var pos = (this.events[name] || []).lastIndexOf(handler);
		if (pos >= 0) this.events[name].splice(pos,1);
	}
	this.fire = function(name,data) {
		for (var func of (this.events[name] || [])) func(name,this,data);
	}
	this.list = function(name) {
		return name ? (this.events[name] || []) : Object.keys(this.events);
	}
	this.exists = function(name,func) {
		return this.events[name] !== undefined && (func ? this.events[name].indexOf(func) != -1 : true);
	}
}
