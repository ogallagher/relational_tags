/**
 * Relational tagging library.
 * 
 * @author Owen Gallagher
 */

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
	 * @throws {RelationalTagException} This tag already exists. Use {@link RelationalTag#new} for 
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
		
			if (this.name in RelationalTag.all_tags) {
				throw new RelationalTagException(
					`tag ${this.name} already exists`, 
					RelationalTagException.TYPE_COLLISION
				)
			}
			else {
				// register tag
				RelationalTag.all_tags[this.name] = this
			
				/**
				 * Relational tag connections. This is how we keep track of tag--[entity,tag] relationships.
				 * 
				 * @type {Object}
				 */
				this.connections = {}
			
				console.log(`info created new tag ${this.name}`)
			}
		}
	}
	
	/**
	 * Convenience wrapper for {@link RelationalTag#connect}.
	 * 
	 * @param {RelationalTag|Object} other
	 * @param {String} connection_type
	 * 
	 * @return {RelationalTagConnection}
	 */ 
	connect_to(other, connection_type) {
		return RelationalTag.connect(this, other, connection_type)
	}
	
	/**
	 * Convenience wrapper for {@link RelationalTag#disconnect}.
	 * 
	 * @param {RelationalTag|Object} other
	 */
	disconnect_to(other) {
		RelationalTag.disconnect(this, other)
	}
	
	/**
	 * Convenience wrapper for {@link RelationalTag#delete}.
	 */ 
	delete_self() {
		RelationalTag.delete(this)
	}
}

/**
 * Package version.
 * @memberOf RelationalTag
 */ 
RelationalTag.VERSION = '0.1.1'

// RelationalTag static variables

/**
 * Whether tag names are case sensitive.
 * @memberOf RelationalTag
 */ 
RelationalTag._is_case_sensitive = false

/**
 * All relational tags.
 * @memberOf RelationalTag
 * 
 * Structure = { name : tag }.
 */ 
RelationalTag.all_tags = {}

/**
 * All tagged entities.
 * @memberOf RelationalTag
 * 
 * This enables association of any entity with tags, without modifying the target entity.
 * 
 * Structure = { entity : { tag : connection } }.
 */ 
RelationalTag._tagged_entities = {}

// RelationalTag static methods

/**
 * Initial configuration.
 * @memberOf RelationalTag
 * 
 * @param {Boolean} is_case_sensitive
 */
RelationalTag.config = function(is_case_sensitive) {
	RelationalTag._is_case_sensitive = is_case_sensitive
}

/**
 * Create a connection between a source and target with the given connection type.
 * @memberOf RelationalTag
 * 
 * @param {RelationalTag|RelationalTagConnection} tag_or_connection The source tag, or a
 * connection instance.
 * 
 * @param {RelationalTag|Object} target The target tag or entity, or {undefined} if the first
 * arg is a connection.
 * 
 * @param {String} connection_type Connection type.
 * 
 * @return RelationalTagConnection
 */
RelationalTag.connect = function(tag_or_connection, target, connection_type) {
	const source_is_connection = (tag_or_connection instanceof RelationalTagConnection)
	
	if (source_is_connection) {
		console.log(`debug rtag.connect called w connection; converting to source`)
		let conn = tag_or_connection
		return RelationalTag.connect(conn.source, conn.target, conn.type)
	}
	else {
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
		
		let tag = tag_or_connection
		
		// connection
		let conn = new RelationalTagConnection(tag, target, connection_type)
		tag.connections[target] = conn
		
		// inverse connection
		if (target_is_tag) {
			target.connections[tag] = conn.inverse()
		}
		else {
			if (!(target in RelationalTag._tagged_entities)) {
				console.log(`info new tagged entity ${target}`)
				RelationalTag._tagged_entities[target] = {}
			}
			
			RelationalTag._tagged_entities[target][tag] = conn.inverse()
		}
		
		return conn
	}
}

/**
 * Remove a connection between a tag and a target.
 * @memberOf RelationalTag
 * 
 * @param {RelationalTag|RelationalTagConnection} tag_or_connection Connection source,
 * or 
 * 
 * @param {RelationalTag|Object} target Connection target, or {undefined} if a
 * connection is provided as the first arg.
 */
RelationalTag.disconnect = function(tag_or_connection, target) {
	const source_is_connection = (tag_or_connection instanceof RelationalTagConnection)
	
	if (source_is_connection) {
		console.log(`debug rtag.disconnect called w connection; converting to source`)
		let conn = tag_or_connection
		return RelationalTag.disconnect(conn.source, conn.target)
	}
	else {
		// remove connection from source
		let tag = tag_or_connection
		tag.connections[target] = undefined
		
		// remove inverse connection from target
		if (target instanceof RelationalTag) {
			target.connections[tag] = undefined
		}
		else {
			if (target in RelationalTag._tagged_entities) {
				RelationalTag._tagged_entities[target][tag] = undefined
			}
			else {
				log.warning(`entity ${target} already untagged`)
			}
		}
	}
}

/**
 * Create a new relational tag.
 * @memberOf RelationalTag
 * 
 * @param {String} name Unique tag name.
 * 
 * @param {Boolean} get_if_exists Whether to return an existing tag if one of the given name already
 * exists. Default is {true}.
 * 
 * @return {RelationalTag}
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
			return RelationalTag.all_tags[name]
		}
		else {
			throw err
		}
	}
}

/**
 * Get an existing relational tag.
 * @memberOf RelationalTag
 * 
 * @param {String} name Unique tag name.
 * 
 * @param {Boolean} new_if_missing Whether to create a new tag if it doesn't exist yet.
 * 
 * @throws {RelationalTagException} The given tag doesn't exist and {new_if_missing == false}.
 */
RelationalTag.get = function(name, new_if_missing) {
	if (!RelationalTag._is_case_sensitive) {
		name = name.toLowerCase()
	}
	
	new_if_missing = new_if_missing === undefined ? true : new_if_missing
	
	let tag = RelationalTag.all_tags[name]
	
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
 * @memberOf RelationalTag
 * 
 * Note this method fails silently, and will do nothing if the given tag doesn't exist.
 * 
 * @param {String|RelationalTag} tag
 */
RelationalTag.delete = function(tag) {
	if (!(tag instanceof RelationalTag)) {
		// convert to tag
		const name = RelationalTag._is_case_sensitive ? tag : tag.toLowerCase()
		tag = RelationalTag.all_tags[name]
		
		if (tag === undefined) {
			log.warning(`skip delete of nonexistent tag ${name}`)
			return
		}
		else {
			// remove from all_tags
			RelationalTag.all_tags[name] = undefined
		}
	}
	else {
		// remove from all_tags
		RelationalTag.all_tags[tag.name] = undefined
	}
	
	// remove all connections
	for (let conn of Object.values(tag.connections)) {
		RelationalTag.disconnect(conn)
	}
}

/**
 * Remove all tags and connections.
 * @memberOf RelationalTag
 * 
 * @return {Number} Number of tags removed.
 */
RelationalTag.clear = function() {
	let num_tags = Object.keys(RelationalTag.all_tags).length
	
	RelationalTag.all_tags = {}
	RelationalTag._tagged_entities = {}
	
	// apply reassign to module members
	exports.all_tags = RelationalTag.all_tags
	// exports._tagged_entities doesn't exist because it's private (_ prefix)
	
	return num_tags
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
	 * @return {String}
	 */
	toString() {
		return `${this.name}.${this.type}: ${this.message}`
	}
}

// RelationalTagException static variables

/**
 * Relational tag exception types, which are converted into static constants.
 * @memberOf RelationalTagException
 * 
 * Ex. 'GENERIC' &rarr; RelationalTagException.TYPE_GENERIC = 'GENERIC'.
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
	 * @throws RelationalTagException The connection type is incompatible with the given source
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
	 * Format properties of the connection into a readable one line string.
	 * 
	 * @returns String
	 */ 
	toString() {
		return `${this.source}=${this.type}=${this.target}`
	}
}

// RelationalTagConnection static variables

/**
 * Relational tag connection types, which are converted into static constants.
 * @memberOf RelationalTagConnection
 * 
 * Ex. 'TO_TAG_UNDIRECTED' &rarr; RelationalTagConnection.TYPE_TO_TAG_UNDIRECTED = 'TO_TAG_UNDIRECTED'.
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
 * @memberOf RelationalTagConnection
 */
RelationalTagConnection._TAG_TAG_TYPES = []
/**
 * Connection types between a tag and an entity.
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
 * @memberOf RelationalTagConnection
 * 
 * @param {String} type
 * 
 * @return {String}
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
