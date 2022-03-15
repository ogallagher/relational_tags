/**
 * @fileOverview Relational tagging library.
 * 
 * @author Owen Gallagher
 */

const { NotImplementedError } = require('standard-errors')

/**
 * Handle optional imports.
 * 
 * @private
 * 
 * @param {Array} opt_libs The resolved optional libraries in the following order: 
 * temp_js_logger
 */ 
function on_opt_libs(opt_libs) {
	return new Promise(function(resolve) {
		const logging = opt_libs[0]
		
		logging.config({
			level: 'debug',
			with_timestamp: false, 
			caller_name: 'relational_tags', 
			with_lineno: false, 
			parse_level_prefix: true, 
			with_level: true,
			with_always_level_name: true, 
			with_cli_colors: true
		})
		console.log('debug configured logging')
		
		logging.imports_promise.then(resolve)
	})
}

// optional dependencies
Promise.all([
	import('temp_js_logger')
]).then(
	on_opt_libs,
	function(err) {
		console.log('warning failed to import optional dependencies')
	}
)

console.log('debug begin define relational_tags library')

/**
 * RelationalTag class.
 * 
 * A relational tag instance can be connected to an entity to categorize it, and also be connected to other 
 * relational tags.
 * 
 * All module-level members and methods are first available as static members of this class for convenience.
 */
class RelationalTag {
	/**
	 * Constructor to create a new relational tag.
	 * 
	 * @param {String} name The name/label/value of this tag.
	 * 
	 * @throws {RelationalTagException} This tag already exists. Use {@link RelationalTag.new} for 
	 * get-if-exists behavior.
	 */
	constructor(name) {
		if (typeof name !== 'string' && !(name instanceof String)) {
			throw new RelationalTagException(
				`${name}:${typeof name} is not allowed for a tag name`,
				RelationalTagException.TYPE_WRONG_TYPE
			)
		}
		else {
   			/**
   			 * Relational tag name.
   			 * 
   			 * @type {String}
   			 */
			this.name = RelationalTag._is_case_sensitive ? name : name.toLowerCase()
		
			if (RelationalTag.all_tags.has(this.name)) {
				throw new RelationalTagException(
					`tag ${this.name} already exists`, 
					RelationalTagException.TYPE_COLLISION
				)
			}
			else {
				// register tag
				RelationalTag.all_tags.set(this.name, this)
			
				/**
				 * Relational tag connections. This is how we keep track of tag--[entity,tag] relationships.
				 * 
				 * @type {Map}
				 */
				this.connections = new Map()
			
				console.log(`info created new tag ${this.name}`)
			}
		}
	}
	
	/**
	 * Convenience wrapper for {@link RelationalTag.connect}.
	 * 
	 * @param {(RelationalTag|Object)} other
	 * @param {String} connection_type
	 * 
	 * @returns {RelationalTagConnection}
	 */ 
	connect_to(other, connection_type) {
		return RelationalTag.connect(this, other, connection_type)
	}
	
	/**
	 * Convenience wrapper for {@link RelationalTag.disconnect}.
	 * 
	 * @param {(RelationalTag|Object)} other
	 */
	disconnect_to(other) {
		RelationalTag.disconnect(this, other)
	}
	
	/**
	 * Convenience wrapper for {@link RelationalTag.delete}.
	 */ 
	delete_self() {
		RelationalTag.delete(this)
	}
	
	/**
	 * Returns this tag represented as json.
	 * 
	 * I cannot use {JSON.stringify} for this because this object has recursive references.
	 * 
	 * @returns {String}
	 */
	toString() {
		let connections = Object.values(this.connections)
		let connections_str = new Array(connections.length)
		
		for (let c=0; c < connections.length; c++) {
			connections_str[c] = connections[c].toString()
		}
		
		return `{"${this.name}": [${connections_str.join(',')}]}`
	}
	
	/**
	 * Whether this tag has the same name as another. It is sometimes desirable to compare using the == or ===
	 * operator instead, as those require that both tags reference the same object in memory.
	 * 
	 * @returns {Boolean}
	 */
	equals(other) {
		return (
			(other instanceof RelationalTag) && 
			other.name == this.name ||
			(!RelationalTag._is_case_sensitive && other.name.toLowerCase() == this.name.toLowerCase())
		)
	}
}

/**
 * Package version.
 * 
 * @memberOf RelationalTag
 */ 
RelationalTag.VERSION = '0.1.6'

// RelationalTag static variables

/**
 * Whether tag names are case sensitive.
 * 
 * @memberOf RelationalTag
 */ 
RelationalTag._is_case_sensitive = false

/**
 * All relational tags.
 * 
 * Structure = `{ name : tag }`.
 * 
 * @memberOf RelationalTag
 */ 
RelationalTag.all_tags = new Map()

/**
 * All tagged entities.
 * 
 * This enables association of any entity with tags, without modifying the target entity.
 * 
 * Structure = `{ entity : { tag : connection } }`.
 * 
 * @memberOf RelationalTag
 */ 
RelationalTag._tagged_entities = new Map()

// RelationalTag static methods

/**
 * Initial configuration.
 * 
 * @memberOf RelationalTag
 * 
 * @param {Boolean} is_case_sensitive
 */
RelationalTag.config = function(is_case_sensitive) {
	RelationalTag._is_case_sensitive = is_case_sensitive
}

/**
 * Whether tag names are case sensitive.
 * 
 * @memberOf RelationalTag
 * 
 * @returns {Boolean}
 */
RelationalTag.is_case_sensitive = function() {
	return RelationalTag._is_case_sensitive
}

/**
 * Create a connection between a source and target with the given connection type.
 * 
 * @memberOf RelationalTag
 * 
 * @param {RelationalTag|RelationalTagConnection} tag_or_connection The source tag, or a
 * connection instance.
 * @param {RelationalTag|Object} target The target tag or entity, or {undefined} if the first
 * arg is a connection.
 * @param {String} connection_type Connection type.
 * 
 * @returns RelationalTagConnection
 * 
 * @throws {RelationalTagException} The given source and target don't match the connection type.
 */
RelationalTag.connect = function(tag_or_connection, target, connection_type) {
	const source_is_connection = (tag_or_connection instanceof RelationalTagConnection)
	
	if (source_is_connection) {
		console.log(`debug rtag.connect called w connection; converting to source`)
		let conn = tag_or_connection
		return RelationalTag.connect(conn.source, conn.target, conn.type)
	}
	else {
		let tag = tag_or_connection
		
		if (!(tag instanceof RelationalTag)) {
			throw new RelationalTagException(
				`first arg must be a RelationalTag instance, not ${typeof tag}`, 
				RelationalTagException.TYPE_WRONG_TYPE
			)
		}
		
		const target_is_tag = (target instanceof RelationalTag)
		
		// resolve type as default
		if (connection_type === undefined && !source_is_connection) {
			if (target_is_tag) {
				connection_type = RelationalTagConnection.TYPE_TO_TAG_UNDIRECTED
			}
			else {
				connection_type = RelationalTagConnection.TYPE_TO_ENT
			}
		}
		
		// connection
		let conn = new RelationalTagConnection(tag, target, connection_type)
		tag.connections.set(target, conn)
		
		// inverse connection
		if (target_is_tag) {
			target.connections.set(tag, conn.inverse())
		}
		else {
			if (!RelationalTag._tagged_entities.has(target)) {
				console.log(`info new tagged entity ${target}`)
				RelationalTag._tagged_entities.set(target, new Map())
			}
			
			RelationalTag._tagged_entities.get(target).set(tag, conn.inverse())
		}
		
		return conn
	}
}

/**
 * Remove a connection between a tag and a target.
 * 
 * @memberOf RelationalTag
 * 
 * @param {RelationalTag|RelationalTagConnection} tag_or_connection Connection source,
 * or connection instance.
 * @param {RelationalTag|Object} target Connection target, or `undefined` if a
 * connection is provided as the first arg.
 */
RelationalTag.disconnect = function(tag_or_connection, target) {
	const source_is_connection = (tag_or_connection instanceof RelationalTagConnection)
	
	if (source_is_connection) {
		console.log(`debug rtag.disconnect called w connection; converting to source`)
		let conn = tag_or_connection
		if (conn.source instanceof RelationalTag) {
			return RelationalTag.disconnect(conn.source, conn.target)
		}
		else {
			return RelationalTag.disconnect(conn.target, conn.source)
		}
	}
	else {
		// remove connection from source
		let tag = tag_or_connection
		tag.connections.delete(target)
		
		// remove inverse connection from target
		if (target instanceof RelationalTag) {
			target.connections.delete(tag)
		}
		else {
			if (RelationalTag._tagged_entities.has(target)) {
				RelationalTag._tagged_entities.get(target).delete(tag)
			}
			else {
				log.warning(`entity ${target} already untagged`)
			}
		}
	}
}

/**
 * Disconnect the given `entity` from all tags.
 * If the entity is already not connected to any tags, this method does nothing.
 * 
 * @memberOf RelationalTag
 * 
 * @param entity Entity to disconnect/untag.
 */
RelationalTag.disconnect_entity = function(entity) {	
	if (RelationalTag._tagged_entities.has(entity)) {
		// disconnect from tags
		let conns = new Array(...RelationalTag._tagged_entities.get(entity).values())
		for (let conn of conns) {
			RelationalTag.disconnect(conn)
		}
		
		// remove from tagged entities
		RelationalTag._tagged_entities.delete(entity)
	}
	else {
		console.log(`info ${entity} already not tagged`)
	}
}

/**
 * Create a new relational tag.
 * 
 * @memberOf RelationalTag
 * 
 * @param {String} name Unique tag name.
 * @param {Boolean} get_if_exists Whether to return an existing tag if one of the given name already
 * exists. Default is `true`.
 * 
 * @returns {RelationalTag}
 * @throws {RelationalTagException}
 */
RelationalTag.new = function(name, get_if_exists) {
	if (!RelationalTag._is_case_sensitive) {
		name = name.toLowerCase()
	}
	
	get_if_exists = get_if_exists === undefined ? true : get_if_exists
	
	try {
		let tag = new RelationalTag(name)
		return tag
	}
	catch (err) {
		console.log(`warning ${err}`)
		
		if (err.type == RelationalTagException.TYPE_COLLISION && get_if_exists) {
			return RelationalTag.all_tags.get(name)
		}
		else {
			throw err
		}
	}
}

/**
 * Get an existing relational tag.
 * 
 * @memberOf RelationalTag
 * 
 * @param {String} name Unique tag name.
 * @param {Boolean} new_if_missing Whether to create a new tag if it doesn't exist yet.
 * 
 * @throws {RelationalTagException} The given tag doesn't exist and `new_if_missing == false`.
 */
RelationalTag.get = function(name, new_if_missing) {
	if (!RelationalTag._is_case_sensitive) {
		name = name.toLowerCase()
	}
	
	new_if_missing = new_if_missing === undefined ? true : new_if_missing
	
	let tag = RelationalTag.all_tags.get(name)
	
	if (tag === undefined) {
		if (new_if_missing) {
			return new RelationalTag(name)
		}
		else {
			throw new RelationalTagException(`tag ${name} not found`, RelationalTagException.TYPE_MISSING)
		}
	}
	else {
		return tag
	}
}

/**
 * Delete an existing relational tag.
 * 
 * Note this method fails silently, and will do nothing if the given tag doesn't exist.
 * 
 * @memberOf RelationalTag
 * 
 * @param {(String|RelationalTag)} tag RelationalTag instance or tag name to delete.
 */
RelationalTag.delete = function(tag) {
	if (!(tag instanceof RelationalTag)) {
		// convert to tag
		const name = RelationalTag._is_case_sensitive ? tag : tag.toLowerCase()
		tag = RelationalTag.all_tags.get(name)
		
		if (tag === undefined) {
			log.warning(`skip delete of nonexistent tag ${name}`)
			return
		}
		else {
			// remove from all_tags
			RelationalTag.all_tags.delete(name)
		}
	}
	else {
		// remove from all_tags
		RelationalTag.all_tags.delete(tag.name)
	}
	
	// remove all connections
	for (let conn of Object.values(tag.connections)) {
		RelationalTag.disconnect(conn)
	}
}

/**
 * Remove all tags and connections.
 * 
 * @memberOf RelationalTag
 * 
 * @returns {Number} Number of tags removed.
 */
RelationalTag.clear = function() {
	let num_tags = RelationalTag.all_tags.size
	
	RelationalTag.all_tags.clear()
	RelationalTag._tagged_entities.clear()
	
	return num_tags
}

/**
 * Load in a set of tags, including optional connection info for each.
 * 
 * Tags can be duplicated; they will only be loaded once.
 * 
 * There are multiple ways to define a relational tags system:
 * 
 * ### From save
 * 
 * Pass a list of {@link RelationalTag} instances as the `tags` arg.
 * 
 * ### Flat
 * 
 * Pass a list of tag name strings. Tags will not have any relationships with each other.
 * 
 * ```
 * rtags.load(['apple','banana','cinnamon','donut'])
 * ```
 * 
 * ### Hierarchy
 * 
 * Pass an object, where each key is a tag name string, and each value is either a single
 * tag name, or a list of tag names.
 * 
 * ```
 * rtags.load({
 * 	'fruit': ['apple','banana','orange'],
 * 	'food': ['fruit','vegetable'],
 * 	'color': ['red','blue','green','orange'],
 * 	'sport': 'football'
 * })
 * ```
 * 
 * @memberOf RelationalTag
 * 
 * @param {(Array|Object)} tags Relational tag names, either as an array or object. Entities not supported. If
 * passed as an array, items can be name strings or {@link RelationalTag} instances.
 * @param {String} tag_tag_type Specify what a key-value relationship in the object/dictionary means. Default
 * of `RelationalTagConnection.TYPE_TO_TAG_CHILD` means the key is the parent of the value.
 * 
 * @returns {Array} List of generated relational tags.
 * 
 * @throws {RelationalTagException} `tags` is not a supported type/format.
 */
RelationalTag.load = function(tags, tag_tag_type) {
	// define optionals
	tag_tag_type = tag_tag_type === undefined ? RelationalTagConnection.TYPE_TO_TAG_CHILD : tag_tag_type
	
	if (tags instanceof Array) {
		console.log(`info loading ${tags.length} relational tags from list`)
		
		for (let tag of tags) {
			if (tag instanceof RelationalTag) {
				if (tag.name in RelationalTag.all_names) {
					console.log(`warning duplicate tag ${tag} on load`)
				}
				
				RelationalTag.all_tags.set(tag.name, tag)
			}
			else if (typeof tag === 'string' || tag instanceof String) {
				RelationalTag.new(tag, true)
			}
			else {
				throw new RelationalTagException(
					`unsupported tag type ${typeof tag}`,
					RelationalTagException.TYPE_WRONG_TYPE
				)
			}
		}
	}
	else if (typeof tags === 'object') {
		let tag_names = Object.keys(tags)
		console.log(`info loading ${tag_names.length} relational tags from object`)
		
		for (let tag_name of tag_names) {
			// create new key tag
			let ktag = RelationalTag.new(tag_name, true)
			
			let value = tags[tag_name]
			
			if (value instanceof Array) {
				// create multiple value tags
				for (let v of value) {
					let vtag = RelationalTag.get(v, true)
					let conn = RelationalTag.connect(ktag, vtag, tag_tag_type)
				}
			}
			else if (typeof value === 'string' || value instanceof String) {
				// create single value tag
				let vtag = RelationalTag.get(value, true)
				RelationalTag.connect(ktag, vtag, tag_tag_type)
			}
			else {
				throw new RelationalTagException(
					`unsupported target type ${typeof value}`,
					RelationalTagException.TYPE_WRONG_TYPE
				)
			}
		}
	}
	else {
		console.log(`error failed to parse tags from:\n${JSON.stringify(tags, undefined, 2)}`)
		
		throw new RelationalTagException(
			`unsupported tags type/format ${typeof tags}`,
			RelationalTagException.TYPE_WRONG_TYPE
		)
	}
	
	return Object.values(RelationalTag.all_tags)
}

/**
 * Whether the given tag or entity is present in the relational tags system/graph.
 * 
 * @memberOf RelationalTag
 * 
 * @returns {Boolean}
 */
RelationalTag.known = function(node) {
	return node instanceof RelationalTag
		? RelationalTag.all_tags.has(node.name)
		: RelationalTag._tagged_entities.has(node)
}

/**
 * Find the shortest path between two nodes in the relational tags graph. Connections are analagous to edges
 * and tags and entities are analagous to nodes. Edge direction (connection type) is not considered.
 * 
 * Implemented using breadth first search, starting from a.
 * 
 * @memberOf RelationalTag
 * 
 * @param {(RelationalTag|Object)} a
 * @param {(RelationalTag|Object)} b
 * 
 * @returns {Array} Array of nodes (tags and entities) along the discovered path, in order from a to b.
 */
RelationalTag.graph_path = function(a, b) {
	if (a == b || b === undefined) {
		if (RelationalTag.known(a)) {
			return [a]
		}
		else {
			return []
		}
	}
	else if (RelationalTag.known(a) && RelationalTag.known(b)) {		
		let path = RelationalTag._graph_path(a, b, new Set())
		return path === undefined ? [] : path
	}
	else {
		return []
	}
}

/**
 * Helper function for {@link RelationalTag.graph_path}. 
 * Assumes both `a` and `b` are in the graph.
 * 
 * @memberOf RelationalTag
 * 
 * @param {(RelationalTag|Object)} a
 * @param {(RelationalTag|Object)} b
 * @param {Set} visits
 * 
 * @returns {Array}
 */
RelationalTag._graph_path = function(a, b, visits) {
	// add current node to visits
	visits.add(a)
	
	let connections = a instanceof RelationalTag
		? a.connections.keys()
		: RelationalTag._tagged_entities.get(a).keys()
	
	// search outward connections
	let nexts = new Array()
	for (let node of connections) {
		if (node == b) {
			// return path
			return [a, node]
		}
		else if (!visits.has(node)) {
			nexts.push(node)
		}
		// else, skip visited node
	}
	
	if (nexts.length == 0) {
		// no path found, no more unexplored nodes
		return undefined
	}
	else {
		// search next level
		for (let next of nexts) {
			let path = RelationalTag._graph_path(next, b, visits)
			
			if (path !== undefined) {
				// return path
				return [a].concat(path)
			}
		}
		
		// no path found in further levels
		return undefined
	}
}

/**
 * Find the shortest distance between two nodes in the relational tags graph. Calls 
 * {@link RelationalTag.graph_path} and then calculates the graph distance of that path to be
 * the number of edges:
 * 
 * ```
 * num_edges = graph_distance().length - 1
 * ```
 * 
 * - `distance == -1` means the nodes are not connected.
 * - `distance == 0` means `a` and `b` are the same node.
 * - `distance > 0` means the nodes are connected.
 * 
 * @memberOf RelationalTag
 * 
 * @param {(RelationalTag|Object)} a
 * @param {(RelationalTag|Object)} b
 * 
 * @returns {Number}
 */
RelationalTag.graph_distance = function(a, b) {
	return RelationalTag.graph_path(a, b).length - 1
}

/**
 * Find all entities directly and indirectly connected to this tag, in graph distance order ascending.
 * 
 * @memberOf RelationalTag
 * 
 * @param {(RelationalTag|String)} tag
 * @param {String} include_tags_by_direction
 * 
 * @returns {Array}
 */
RelationalTag.search_by_tag = function(tag, include_tags_by_direction) {
	throw new NotImplementedError('search_by_tag not yet implemented')
}

/**
 * Class for all exceptions/errors specific to relational tags.
 */ 
class RelationalTagException {
	/**
	 * Create a relational tag exception instance.
	 * 
	 * @param {String} message Error message.
	 * 
	 * @param {String} type Error type.
	 */
	constructor(message, type) {
		this.name = 'RelationalTagException'
		this.message = message
		this.type = type === undefined ? RelationalTagException.TYPE_GENERIC : type
	}
	
	/**
	 * Format exception as readable string.
	 * 
	 * @returns {String}
	 */
	toString() {
		return `${this.name}.${this.type}: ${this.message}`
	}
}

// RelationalTagException static variables

/**
 * Relational tag exception types, which are converted into static constants.
 * 
 * Ex. `'GENERIC'` &rarr; `RelationalTagException.TYPE_GENERIC = 'GENERIC'`.
 * 
 * @memberOf RelationalTagException
 */
RelationalTagException.TYPES = [
	'GENERIC',
	'MISSING',
	'WRONG_TYPE',
	'COLLISION'
]
for (let type of RelationalTagException.TYPES) {
	RelationalTagException[`TYPE_${type.toUpperCase()}`] = type.toUpperCase()
}
console.log(`debug RelationalTagException.TYPES = ${JSON.stringify(RelationalTagException.TYPES)}`)

/**
 * Connection between a relational tag and another tag or entity.
 */ 
class RelationalTagConnection {
	/**
	 * Create a new connection instance. This should not be called directly, as it doesn't register
	 * itself with the source or target. Use {@link RelationalTag#connect} instead.
	 * 
	 * @param {RelationalTag} source
	 * 
	 * @param {RelationalTag|Object} target
	 * 
	 * @param {String} type
	 * 
	 * @throws {RelationalTagException} The connection type is incompatible with the given source
	 * and target.
	 */
	constructor(source, target, type) {
		this.source = source
		this.target = target
		this.type = type
		
		if (
			RelationalTagConnection._TAG_TAG_TYPES.indexOf(type) != -1 && 
			!(target instanceof RelationalTag)
		) {
			throw new RelationalTagException(
				`cannot create ${type} connection with entity ${target}`, 
				RelationalTagException.TYPE_WRONG_TYPE
			)
		}
	}
	
	/**
	 * Return a new connection that is the inverse of this one, by swapping source and target and
	 * using the inverse connection type.
	 * 
	 * @returns RelationalTagConnection
	 */
	inverse() {
		return new RelationalTagConnection(
			this.target,
			this.source,
			RelationalTagConnection.inverse_type(this.type)
		)
	}
	
	/**
	 * Convenience wrapper for {@link RelationalTag#disconnect}.
	 */
	disconnect() {
		RelationalTag.disconnect(this)
	}
	
	/**
	 * Format properties of the connection into a json compatible array.
	 * 
	 * Structure = `[ source , type , target ]`. Tags are stored as their name strings, while entities
	 * are kept unchanged. The resulting array is then passed as an argument to `JSON.stringify`. Therefore,
	 * all properties that can be stored in a json representation of the entity will be preserved.
	 * 
	 * {@link RelationalTag#toString} is not used for serializing tags because it would case recursion when
	 * serializing their connections.
	 * 
	 * @returns {String}
	 */ 
	toString() {
		let source = this.source instanceof RelationalTag
			? this.source.name
			: this.source
		
		let target = this.target instanceof RelationalTag
			? this.target.name
			: this.target
		
		return JSON.stringify([source, this.type, target])
	}
	
	/**
	 * Whether the given argument is an equivalent connection (same source, target, and type).
	 * 
	 * @returns {Boolean}
	 */
	equals(other) {
		return (
			other instanceof RelationalTagConnection &&
			other.source == this.source &&
			other.target == this.target &&
			other.type == this.type
		)
	}
}

// RelationalTagConnection static variables

/**
 * Relational tag connection types, which are converted into static constants.
 * 
 * Ex. `'TO_TAG_UNDIRECTED'` &rarr; `RelationalTagConnection.TYPE_TO_TAG_UNDIRECTED = 'TO_TAG_UNDIRECTED'`.
 * 
 * @memberOf RelationalTagConnection
 */
RelationalTagConnection.TYPES = [
    'TO_TAG_UNDIRECTED',
    'TO_TAG_PARENT',
	'TO_TAG_CHILD',
	'TO_ENT',
    'ENT_TO_TAG'
]

/**
 * Connection types between tags.
 * 
 * @memberOf RelationalTagConnection
 */
RelationalTagConnection._TAG_TAG_TYPES = []
/**
 * Connection types between a tag and an entity.
 * 
 * @memberOf RelationalTagConnection
 */
RelationalTagConnection._TAG_ENT_TYPES = []

for (let type of RelationalTagConnection.TYPES) {
	let T = type.toUpperCase()
	
	RelationalTagConnection[`TYPE_${T}`] = T
	
	if (T.indexOf('TAG') != -1) {
		RelationalTagConnection._TAG_TAG_TYPES.push(T)
	}
	
	if (T.indexOf('ENT') != -1) {
		RelationalTagConnection._TAG_ENT_TYPES.push(T)
	}
}
console.log(`debug RelationalTagConnection.TYPES = ${JSON.stringify(RelationalTagConnection.TYPES)}`)

// RelationalTagConnection static methods

/**
 * Return the inverse of the given connection type.
 * 
 * @memberOf RelationalTagConnection
 * 
 * @param {String} type
 * 
 * @returns {String}
 */ 
RelationalTagConnection.inverse_type = function(type) {
	switch (type) {
		case RelationalTagConnection.TYPE_TO_TAG_PARENT:
			return RelationalTagConnection.TYPE_TO_TAG_CHILD
			
		case RelationalTagConnection.TYPE_TO_TAG_CHILD:
			return RelationalTagConnection.TYPE_TO_TAG_PARENT
			
		case RelationalTagConnection.TYPE_TO_ENT:
			return RelationalTagConnection.TYPE_ENT_TO_TAG
			
		case RelationalTagConnection.TYPE_ENT_TO_TAG:
			return RelationalTagConnection.TYPE_TO_ENT
			
		default:
			// connection type is undirected; no inverse
			return type
	}
}

// exports

exports.RelationalTag = RelationalTag
exports.RelationalTagException = RelationalTagException
exports.RelationalTagConnection = RelationalTagConnection

for (let key of Object.keys(RelationalTag)) {
	// export all public members of the RelationalTag class to module level
	if (!key.startsWith('_')) {
		exports[key] = RelationalTag[key]
	}
}

console.log('debug end define relational_tags library')
