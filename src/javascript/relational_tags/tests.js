/**
 * @fileOverview Relational tags javascript implementation tests.
 * 
 * TODO temp_js_logger should be optional
 * 
 * @author Owen Gallagher (https://github.com/ogallagher)
 */

const assert = require('assert')

describe('relational_tags', function() {
	const temp_logger = require('temp_js_logger')
	const rt = require('./relational_tags.js')
	
	const logging_level = 'debug'
	
	// import rt classes into namespace
	const RelationalTag = rt.RelationalTag
	const RelationalTagException = rt.RelationalTagException
	const RelationalTagConnection = rt.RelationalTagConnection
	
	function format_search(search) {
		function node_string(n) {
			return n instanceof RelationalTag ? n.name : n.toString()
		}
		
		if (Array.isArray(search)) {
			// not full search, just scalar array of nodes
			return '[' + search.map(node_string).join(',') + ']'
		}
		else {
			// true search
			let paths = []
	
			for (let node of search.keys()) {
				let nodes = search.get(node).map(node_string)
		
				paths.push(
					`${node instanceof RelationalTag ? node.name : node.toString()} => [${nodes.join(',')}]`
				)
			}
	
			return paths.join('\n')
		}
	}
	
	before(function(done) {
		// configure logging
		temp_logger.config({
			level: logging_level,
			with_timestamp: false, 
			caller_name: 'tests', 
			with_lineno: false, 
			parse_level_prefix: true, 
			with_level: true,
			with_always_level_name: true, 
			with_cli_colors: true
		})
		console.log('debug configured logging')
		
		// define Array equality
		Array.prototype.array_equals = function(other) {
			if (other instanceof Array && this.length == other.length) {
				for (let i=0; i < this.length; i++) {
					if (this[i] !== other[i]) {
						console.log(`warning ${this[i]} != ${other[i]}`)
						return false
					}
				}
				
				return true
			}
			else {
				console.log(`warning ${this.length} != ${other instanceof Array ? other.length : typeof other}`)
				return false
			}
		}
		
		// define Set equality
		Set.prototype.set_equals = function(other) {
			if (other instanceof Set && this.size == other.size) {
				for (let value of this) {
					if (!other.has(value)) {
						console.log(`warning ${value} not in ${other}`)
						return false
					}
				}
				
				return true
			}
			else {
				console.log(`warning ${this.size} != ${other instanceof Set ? other.size : typeof other}`)
				return false
			}
		}
		
		temp_logger.imports_promise.then(done)
	})
	
	it('imports correctly', function() {
		assert.equal(require('./package.json').version, rt.VERSION, 'hardcoded version matches package version')
		
		assert.ok(rt !== undefined)
		console.log(`debug rt.VERSION = ${rt.VERSION}`)
		assert.ok(RelationalTag !== undefined)
		console.log(`debug RelationalTag.VERSION = ${RelationalTag.VERSION}`)
		assert.ok(RelationalTagException !== undefined)
		assert.ok(RelationalTagConnection !== undefined)
	})
	
	describe('RelationalTag', function() {
		it('constructs new tags', function() {
			let red = new RelationalTag('red')
			assert.strictEqual(red.name, 'red')
			
			assert.ok(RelationalTag.all_tags.has(red.name), 'red tag in all tags')
			assert.ok(RelationalTag.get('red') instanceof RelationalTag, 'red tag is relational tag')
		})
		
		it('only allows strings for tag names', function() {
			const type_exception = {
				name: 'RelationalTagException',
				type: RelationalTagException.TYPE_WRONG_TYPE
			}
			
			assert.throws(
				function() {
					new RelationalTag(11)
				},
				type_exception
			)
			
			new RelationalTag('apple')
			assert.ok(true, 'constructor allows string literal')
			
			new RelationalTag(new String('banana'))
			assert.ok(true, 'constructor allows String instance')
		})
		
		// TODO create some tags and entities before confirming clear
		it('clears all existing tags and tagged entities', function() {
			let num_tags = RelationalTag.all_tags.size
			let num_cleared = RelationalTag.clear()
			assert.equal(
				num_tags, 
				num_cleared, 
				`tag count before clear ${num_tags} equals cleared count ${num_cleared}`
			)
			assert.equal(RelationalTag.all_tags.size, 0, 'tag count after clear is 0')
			assert.equal(RelationalTag._tagged_entities.size, 0, 'tagged entity count is 0')
			assert.equal(rt.all_tags.size, 0, 'module tag count after clear is 0')
		})
		
		it('fails to construct existing tags', function() {
			const exists_exception = {
				name: 'RelationalTagException',
				type: RelationalTagException.TYPE_COLLISION
			}
			
			// reset tags
			RelationalTag.clear()
			
			new RelationalTag('apple')
			assert.equal(RelationalTag.is_case_sensitive(), false, 'not in case sensitive mode')
			assert.throws(
				function() {
					let apple = new RelationalTag('Apple')
					console.log(`warning recreated tag ${apple.name}`)
				},
				exists_exception
			)
		})
	})
	
	it('has all RelationalTag public members and no private members', function() {
		for (let key of Object.keys(RelationalTag)) {
			let is_private = key.startsWith('_')
			assert.ok(
				(is_private && !(key in rt)) ||
				(!is_private && key in rt),
				`RelationalTag.${key} in rt module?`
			)
		}
	})
	
	describe('new', function() {
		let tags = ['one', 'two', 'three']
		
		before(function() {
			// reset tags
			console.log(`debug reset tags`)
			rt.clear()
			
			for (let name of tags) {
				rt.new(name)
			}
		})
		
		it('creates tags', function() {
			rt.clear()
			for (let name of tags) {
				rt.new(name)
			}
			
			assert.equal(tags.length, rt.all_tags.size, `create ${tags.length} tags`)
			
			assert.ok(rt.get(tags[0], false) instanceof RelationalTag, `created tag ${tags[0]}`)
		})
		
		it('allows call to new when tag exists', function() {
			// is case insensitive
			assert.equal(rt.is_case_sensitive(), false, 'should not be in case sensitive mode')
			
			let bad_names = ['ONE', 'three']
			
			for (let name of bad_names) {
				assert.ok(rt.new(name, true) instanceof RelationalTag, `got existing tag ${name}`)
			}
		})
		
		it('disallows call to new when tag exists', function() {
			assert.throws(
				function() { rt.new(tags[0], false) },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_COLLISION
				},
				'collision exception not thrown on new(name, get_if_exists=false)'
			)
		})
	})
	
	describe('get', function() {
		before(function() {
			rt.clear()
			rt.load({
				'red': [],
				'color': 'red'
			})
		})
		
		it('gets existing tags', function() {
			assert.equal(rt.get('red').name, 'red')
			assert.equal(rt.get('color').name, 'color')
		})
		
		it('creates new tags with new_if_missing', function() {
			assert.equal(rt.get('yellow', true).name, rt.get('yellow').name)
		})
		
		it('fails to get missing tags', function() {
			assert.throws(
				function() { rt.get('blue', false) },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_MISSING
				}
			)
		})
	})
	
	describe('delete', function() {
		let tags = ['red', 'green', 'blue', 'yellow']
		let ents = ['apple', 'banana', 'strawberry']
		
		before(function() {
			console.log('debug reset tags')
			rt.clear()
			
			for (let tag of tags) {
				rt.new(tag)
			}
		})
		
		it('deletes existing tags', function() {
			let deleted = rt.new('deleted')
			
			rt.delete(deleted)
			assert.ok(
				rt.all_tags[deleted.name] === undefined, 
				`${deleted.name} not in rt.all_tags after delete by reference`
			)
			assert.ok(RelationalTag.all_tags[deleted.name] === undefined, `${deleted.name} not in RT.all_tags`)
			
			deleted = rt.new('deleted')
			rt.delete(deleted.name)
			assert.ok(
				rt.all_tags[deleted.name] === undefined, 
				`${deleted.name} not in rt.all_tags after delete by name`
			)
		})
		
		it('fails to delete missing tags quietly', function() {
			let num_tags = Object.keys(rt.all_tags).length
			let missing = rt.new('missing')
			rt.delete(missing)
			
			assert.equal(num_tags, Object.keys(rt.all_tags).length)
		})
	})
	
	describe('load', function() {
		it('loads tags from flat list', function() {
			console.log('debug reset tags')
			rt.clear()
			
			let tag_names = ['red', 'green', 'blue', 'blue']
			rt.load(tag_names)
			
			// remove duplicates
			tag_names = new Array(...new Set(tag_names))
			assert.equal(
				rt.all_tags.size, 
				tag_names.length, 
				`created ${tag_names.length} tags from flat list`
			)
		})
		
		it('loads connected tags as hierarchical dict', function() {
			console.log('debug reset tags')
			rt.clear()
			
			let tags = {
				'color': ['red', 'green', 'blue', 'blue', 'orange'],
				'fruit': ['banana', 'orange']
			}
			let tag_tag_type = RelationalTagConnection.TYPE_TO_TAG_CHILD
			
			// load tags graph
			rt.load(tags)
			
			// test graph structure
			assert.ok(rt.get('color').connections.has(rt.get('red')), 'red is in color connections')
			assert.ok(rt.get('red').connections.has(rt.get('color')), 'color is in red connections')
			
			let red_to_color = rt.get('red').connections.get(rt.get('color'))
			let color_to_red = rt.get('color').connections.get(rt.get('red'))
			assert.ok(red_to_color instanceof RelationalTagConnection, 'red-color is connection')
			assert.ok(
				red_to_color.equals(color_to_red.inverse()), 
				`red-color ${red_to_color} equals color-red.inverse ${color_to_red}`
			)
			
			assert.ok(
				rt.get('color').connections.has(rt.get('orange')) &&
				rt.get('fruit').connections.has(rt.get('orange')),
				'orange is child of color and fruit'
			)
		})
	})
	
	describe('managing connections', function() {
		let tag_names = ['color', 'red', 'yellow']
		let apple = 'apple'
		let banana = 'banana'
		let object = {
			name: 'object',
			fruit: [apple, banana],
			method: function(message) {
				console.log(`${this.name} says ${message}`)
			}
		}
		
		describe('instance.connect_to, class.connect', function() {
			it('connects tags', function() {
				// reset
				rt.clear()
				rt.load(tag_names)
				let color = rt.get('color')
				let red = rt.get('red')
				let yellow = rt.get('yellow')
				
				// connect colors w instance methods
				color.connect_to(red, RelationalTagConnection.TYPE_TO_TAG_CHILD)
				yellow.connect_to(color, RelationalTagConnection.TYPE_TO_TAG_PARENT)
				
				// reconnect is allowed
				color.connect_to(red, RelationalTagConnection.TYPE_TO_TAG_CHILD)
				
				// check connections
				assert.ok(color.connections.has(red))
				assert.ok(yellow.connections.has(color))
				
				// reset
				rt.clear()
				rt.load(tag_names)
				color = rt.get('color')
				red = rt.get('red')
				yellow = rt.get('yellow')
				
				// connect colors w class & module methods
				rt.connect(color, red, RelationalTagConnection.TYPE_TO_TAG_CHILD)
				RelationalTag.connect(yellow, color, RelationalTagConnection.TYPE_TO_TAG_PARENT)
				
				// check connections
				assert.ok(color.connections.has(red))
				assert.ok(yellow.connections.has(color))
			})
			
			it('connects entities', function() {
				// reset
				rt.clear()
				rt.load(tag_names)
				let color = rt.get('color')
				let red = rt.get('red')
				let yellow = rt.get('yellow')
				
				// connect colors to entities
				red.connect_to(apple)
				rt.connect(yellow, banana)
				
				// validate connections
				assert.ok(red.connections.has(apple))
				assert.equal(red.connections.get(apple).type, RelationalTagConnection.TYPE_TO_ENT)
				assert.ok(!red.connections.has(banana))
				
				assert.ok(RelationalTag._tagged_entities.get(banana).has(yellow))
				assert.equal(
					RelationalTag._tagged_entities.get(banana).get(yellow).type,
					RelationalTagConnection.TYPE_ENT_TO_TAG
				)
				
				// fail to connect backwards
				assert.throws(
					function() { rt.connect(banana, yellow) },
					{
						name: 'RelationalTagException',
						type: RelationalTagException.TYPE_WRONG_TYPE
					}
				)
			})
		})
		
		describe('instance.disconnect_to, class.disconnect', function() {
			let color, red, yellow
			
			before(function() {
				rt.clear()
				
				rt.load(tag_names)
				
				color = rt.get('color')
				red = rt.get('red')
				yellow = rt.get('yellow')
				
				color.connect_to(red)
				color.connect_to(yellow)
				red.connect_to(apple)
				yellow.connect_to(banana)
			})
			
			it('disconnects tags', function() {
				// instance method
				color.disconnect_to(red)
				// static method
				rt.disconnect(yellow, color)
				
				// validate
				assert.ok(
					!color.connections.has(red) && !red.connections.has(color),
					'color-red and red-color disconnected'
				)
				assert.ok(
					!yellow.connections.has(color) && !color.connections.has(yellow),
					'yellow-color and color-yellow disconnected'
				)
			})
			
			it('disconnects entities', function() {
				// instance method
				red.disconnect_to(apple)
				// static method
				rt.disconnect(yellow, banana)
				
				// validate
				assert.ok(
					!red.connections.has(apple) && 
					!RelationalTag._tagged_entities.get(apple).has(red),
					'red-apple and apple-red disconnected'
				)
				assert.ok(
					!yellow.connections.has(banana) && 
					!RelationalTag._tagged_entities.get(banana).has(yellow),
					'yellow-banana and banana-yellow disconnected'
				)
			})
		})
		
		describe('class.disconnect_entity', function() {
			before(function() {
				rt.clear()
				rt.load(tag_names)
			})
			
			it('disconnects various entities', function() {
				rt.get('red').connect_to(apple)
				rt.connect(rt.get('color'), object)
				RelationalTag.connect(RelationalTag.get('yellow'), object)
				
				assert.ok(
					RelationalTag._tagged_entities.has(apple),  
					`${apple} not found in tagged entities: `
				)
				assert.ok(
					RelationalTag._tagged_entities.has(object), 
					`${object} not found in tagged entities`
				)
				
				// disconnect apple and object
				rt.disconnect_entity(apple)
				assert.ok(
					!RelationalTag._tagged_entities.has(apple),
					`${apple} found after disconnect`
				)
				assert.ok(
					!rt.get('red').connections.has(apple),
					`${apple} connected to red after disconnect`
				)
				
				rt.disconnect_entity(object)
				assert.ok(
					!RelationalTag._tagged_entities.has(object),
					`${object} found after disconnect`
				)
				assert.ok(
					!rt.get('color').connections.has(object),
					`${object} connected to color after disconnect`
				)
			})
		})
	})
	
	describe('graph traversal', function() {
		let apple = 'apple'
		let rock = 'rock'
		let leaf = 'leaf'
		
		before(function() {
			console.log('debug reset tags')
			rt.clear()
			
			rt.load({
				'fruit': ['banana', 'cinnamon', 'donut', 'orange'],
				'organic': ['fruit', 'animal'],
				'color': ['red', 'green', 'blue', 'yellow', 'orange'],
				'animal': ['elephant', 'fish', 'giraffe', 'hyena']
			})
			
			// note apple is an entity here
			rt.connect(rt.get('fruit'), apple)
			
	        rt.connect(rt.get('green'), leaf)
	        rt.get('banana').connect_to(leaf)
	        rt.connect(rt.get('orange'), leaf)
		})
		
		it('calculates graph paths and distances', function() {
			let organic = rt.get('organic')
			let fruit = rt.get('fruit')
			
			let rock_rock = rt.graph_path(rock)
			let organic_organic = rt.graph_path(organic)
			let organic_fruit = rt.graph_path(organic, fruit)
			let organic_apple = rt.graph_path(organic, apple)
			let apple_organic = rt.graph_path(apple, organic)
			
			assert.ok(rock_rock.array_equals([]))
			assert.ok(organic_organic.array_equals([organic]))
			assert.ok(organic_fruit.array_equals([organic, fruit]))
			assert.ok(organic_apple.array_equals([organic, fruit, apple]))
			assert.ok(apple_organic.array_equals(organic_apple.reverse()))
			
			assert.equal(rt.graph_distance(rock), -1)
			assert.equal(rt.graph_distance(organic), 0)
			assert.equal(rt.graph_distance(apple), 0)
			assert.equal(rt.graph_distance(organic, fruit), 1)
		})
		
		it('searches entities by tag', function() {
			// fail if tag not found
			assert.throws(
				function() { rt.search_entities_by_tag('nothing', false) },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_MISSING
				},
				'collision exception not thrown on search from missing tag'
			)
			
			// find leaf by fruit
			const banana_leaf = rt.search_entities_by_tag(
				'banana', 
				RelationalTagConnection.TYPE_TO_TAG_CHILD, 
				true
			)
			console.log(`debug banana entities:\n${format_search(banana_leaf)}`)
			assert.ok(banana_leaf.has(leaf))
			assert.ok(banana_leaf.get(leaf).array_equals([rt.get('banana'), leaf]))
			assert.ok(new Set(banana_leaf.keys()).set_equals(
				new Set(rt.search_entities_by_tag('banana', false))
			))
			
			const fruit_leaf = rt.search_entities_by_tag(
				rt.get('fruit'), 
				RelationalTagConnection.TYPE_TO_TAG_CHILD, 
				true
			)
			console.log(`debug fruit entities:\n${format_search(fruit_leaf)}`)
			assert.ok(fruit_leaf.has(leaf))
			assert.equal(fruit_leaf.get(leaf).length, 3)
			assert.equal(fruit_leaf.get(leaf)[0], rt.get('fruit'))
			assert.equal(fruit_leaf.get(leaf)[2], leaf)
			
			// find leaf by color
			const color_leaf = rt.search_entities_by_tag(
				rt.get('color'), 
				RelationalTagConnection.TYPE_TO_TAG_CHILD, 
				true
			)
			console.log(`debug color entities:\n${format_search(color_leaf)}`)
			assert.ok(color_leaf.has(leaf))
			assert.equal(color_leaf.get(leaf).length, 3)
			assert.equal(color_leaf.get(leaf)[0], rt.get('color'), 'color not first in path to leaf')
			assert.equal(color_leaf.get(leaf)[2], leaf, 'leaf not last in path to leaf')
		})
		
		it('searches tags by entity without query', function() {
			// find ancestor tags of leaf
			let leaf_tags = RelationalTag._search_descendants(
				leaf,
				RelationalTagConnection.TYPE_TO_TAG_PARENT,
				false,		// include_entities
				true		// include_tags
			)
			console.log(`debug leaf tags:\n${format_search(leaf_tags)}`)
			for (let tag of RelationalTag._tagged_entities.get(leaf).keys()) {
				assert.ok(leaf_tags.has(tag), `${tag.name} not in leaf tags`)
			}
			
			assert.ok(leaf_tags.has(rt.get('fruit')))
			assert.ok(leaf_tags.has(rt.get('color')))
			assert.ok(!leaf_tags.has(rt.get('animal')))
		})
		
		it('searches tags by entity with query', function() {
			let query = /.*an.*/
			let leaf_tags = rt.search_tags_of_entity(
				leaf, 
				query, 
				RelationalTagConnection.TYPE_TO_TAG_PARENT, 
				true
			)
			console.log(`debug leaf tags matching ${query}:\n${format_search(leaf_tags)}`)
			assert.ok(leaf_tags.has(rt.get('orange')), 'orange not in leaf tags')
			assert.ok(leaf_tags.has(rt.get('organic')), 'organic not in leaf tags')
			assert.ok(leaf_tags.has(rt.get('banana')), 'banana not in leaf tags')
			assert.ok(!leaf_tags.has(rt.get('green')), `green leaf tag matched query ${query}`)
			
			rt.connect(rt.new('bananas'), leaf)
			query = 'banana'
			leaf_tags = rt.search_tags_of_entity(leaf, query)
			assert.equal(leaf_tags.indexOf(rt.get('banana')), 0, 'banana not in leaf tags')
			assert.equal(leaf_tags.indexOf(rt.get('bananas')), -1, `bananas leaf tag matched query ${query}`)
		})
		
		it('searches tags by tag', function() {
			// find descendant tags of fruit
			// TODO use scoped variables?
			const navel = rt.new('navel')
			rt.connect(navel, rt.get('orange'), RelationalTagConnection.TYPE_TO_TAG_PARENT)
			
			const fruit_tags = RelationalTag._search_descendants(
				rt.get('fruit'),
				RelationalTagConnection.TYPE_TO_TAG_CHILD,
				false,		// include_entities
				true		// include_tags
			)
			console.log(`debug fruit tags:\n${format_search(fruit_tags)}`)
			for (let tag of rt.get('fruit').connections.keys()) {
				if (rt.get('fruit').connections.get(tag).type == RelationalTagConnection.TYPE_TO_TAG_CHILD) {
					assert.ok(fruit_tags.has(tag), `${tag.name} not in fruit descendant tags`)
				}
				else {
					assert.ok(!fruit_tags.has(tag), `${tag.name} in fruit descendant tags`)
				}
			}
			
			assert.ok(fruit_tags.has(navel))
		})
	})
	
	describe('json save + load', function() {
		before(function() {
			rt.clear()
			
			rt.load({
				color: ['red', 'orange', 'yellow']
			})
			
			rt.get('red').connect_to({
				type: 'apple',
				age: 'ripe'
			})
		})
		
		it('saves and restores tags and entities', function() {
			const json = rt.save_json()
			assert.equal(typeof json, 'string')
			
			rt.clear()
			
			let loaded = rt.load_json(json)
			for (let tag_loaded of loaded) {
				assert.ok(
					rt.all_tags.has(tag_loaded.name),
					`${tag_loaded} not found in relational tags`
				)
			}
			
			assert.ok(rt.get('color').connections.has(rt.get('red')))
			assert.equal(
				rt.get('color').connections.get(rt.get('red')).type,
				RelationalTagConnection.TYPE_TO_TAG_CHILD
			)
			
			let loaded_ent = new Array(...RelationalTag._tagged_entities.keys())[0]
			assert.ok('type' in loaded_ent && loaded_ent['type'] == 'apple')
		})
		
		it('throws exceptions on invalid loads', function() {
			let broken = {
				member: 'broken'
			}
			rt.connect(rt.get('yellow'), broken)
			assert.ok(rt.get('yellow').connections.has(broken))
			
			let yellow_json = rt.save_tag('yellow').substring(1)
			assert.throws(
				function() { rt.load_tag(yellow_json) },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_FORMAT
				}
			)
			
			let json = rt.save_json().substring(1)
			assert.throws(
				function() { rt.load_json(json) },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_FORMAT
				}
			)
		})
	})
	
	describe('aliasing', function() {
		let tags = ['color', 'red']
		
		before(function() {
			// reset tags
			console.log(`debug reset tags`)
			rt.clear()
			
			for (let name of tags) {
				rt.new(name)
			}
			
			rt.get('color').connect_to(rt.get('red'))
		})
		
		it('adds and removes tag aliases', function() {
			assert.ok(rt.get('color').aliases.has('color'), 'the name of a tag is an alias')
			
			// add
			rt.alias('color', 'colour')
			assert.ok(rt.get('color').aliases.has('colour'), 'colour should be an alias for color')
			assert.equal(rt.get('color'), rt.get('colour'), 'tags for color and colour should be the same')
			
			rt.alias(rt.get('color'), 'colour', 'should not throw error if alias already set')
			
			assert.equal(rt.get('colour'), rt.get('color'), 'get(colour) should be same tag as get(color)')
			assert.throws(
				function() { rt.new('colour', false) },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_COLLISION
				},
				'new(colour, !get_if_exists) should throw error since already an alias for color'
			)
			
			// delete
			rt.remove_alias('cooler')
			assert.throws(
				// skip_if_no_alias = false
				function() { rt.remove_alias('cooler', true, false) },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_MISSING
				},
				'remove_alias(alias, ?, !skip_if_no_alias) should throw error since cooler is not an alias'
			)
			
			rt.remove_alias('colour')
			assert.throws(
				function() { rt.get('colour', false) },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_MISSING
				},
				'get(colour, !new_if_missing) should throw error because colour alias was removed'
			)
			
			assert.throws(
				function() { rt.remove_alias('color') },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_DELETE_DANGER
				},
				'remove_alias(color) should throw error because color is primary name/alias without new name provided'
			)
		})
		
		it('can rename a tag', function() {
			rt.remove_alias('color', undefined, undefined, '색깔')
			assert.ok(!rt.all_tags.has('color'))
			console.log(`info color (renamed) = ${rt.get('색깔', false)}`)
			
			rt.rename('색깔', 'color')
			assert.ok(rt.all_tags.has('색깔'), 'rename preserves old aliases')
			console.log(
				`info color (restored)=${rt.get('color', false)}. aliases=${[...rt.get('color').aliases]}`
			)
			
			assert.throws(
				function() { rt.rename('cooler', 'colour') },
				{
					name: 'RelationalTagException',
					type: RelationalTagException.TYPE_MISSING
				},
				'cooler is not a tag that can be renamed'
			)
			
			rt.rename('색깔', 'hue', 'can rename color/색깔 by alias')
		})
		
		describe('graph traversal', function() {
			before(function() {
				// initial aliases
				rt.alias('color', 'colour')
				rt.alias('red', 'scarlet')
				
				// undirected tag graph
				rt.new('tomato').connect_to(rt.get('red'))
				rt.get('scarlet').connect_to(rt.get('colour'))
				rt.get('tomato').connect_to(rt.new('fruit'))
			})
			
			it('considers aliases to be distance zero', function () {
				let color_color = rt.graph_path(rt.get('color', false))
				let colour_colour = rt.graph_path(rt.get('colour', false))
				
				assert.ok(
					color_color.array_equals(colour_colour), 
					`single node paths should be equivalent for `
					+ `${format_search(color_color)} and ${format_search(colour_colour)}`
				)
				
				let color_colour = rt.graph_path(rt.get('color'), rt.get('colour'))
				assert.ok(
					color_colour.array_equals([rt.get('color')]),
					`path from color to colour ${format_search(color_colour)} should also be single node`
				)
			})
			
			it('searches correctly with aliases', function() {
				let tomato_tags = RelationalTag._search_descendants(
					rt.get('tomato'),
					RelationalTagConnection.TYPE_TO_TAG_UNDIRECTED,
					false,		// include_entities
					true		// include_tags
				)
				console.log(`debug tomato tags:\n${format_search(tomato_tags)}`)
				
				assert.ok(tomato_tags.has(rt.get('scarlet', false), 'close alias scarlet missing'))
				assert.ok(tomato_tags.has(rt.get('red', false, 'close name red missing')))
				assert.ok(tomato_tags.has(rt.get('color', false, 'distant name color missing')))
				assert.ok(tomato_tags.has(rt.get('colour', false, 'distant alias colour missing')))
			})
		})
	})
	
	describe('RelationalTagConnection', function() {
		let tags = ['red', 'green', 'blue']
		let ents = ['apple', 'banana', 'strawberry']
		
		before(function() {
			// reset tags
			console.log(`debug reset tags`)
			rt.clear()
			
			for (let tag of tags) {
				rt.new(tag, false)
			}
		})
		
		describe('constructor', function() {
			it('creates connections of all tag-tag types', function() {
				for (let type of RelationalTagConnection._TAG_TAG_TYPES) {
					let tag_to_tag = new RelationalTagConnection(
						rt.get(tags[0]),
						rt.get(tags[1]),
						type
					)
					assert.equal(tag_to_tag.type, type, `conn type equals ${type}`)
				}
			})
			
			it('creates connections of all tag-ent types', function() {
				let tag = rt.get(tags[0])
				let ent = ents[0]
				
				let tag_to_ent = new RelationalTagConnection(
					tag, 
					ent, 
					RelationalTagConnection.TYPE_TO_ENT
				)
				
				assert.equal(tag_to_ent.type, RelationalTagConnection.TYPE_TO_ENT)
				assert.equal(tag_to_ent.source, tag)
				assert.equal(tag_to_ent.target, ent)
				
				let ent_to_tag = new RelationalTagConnection(
					ent,
					tag,
					RelationalTagConnection.TYPE_ENT_TO_TAG
				)
				
				assert.equal(ent_to_tag.type, RelationalTagConnection.TYPE_ENT_TO_TAG)
				assert.equal(ent_to_tag.source, ent)
				assert.equal(ent_to_tag.target, tag)
			})

			it('prevents invalid connections', function() {
				let t1 = rt.new('one')
				let t2 = rt.new('two')
				let ent = 'ent'

				assert.throws(
					function() { new RelationalTagConnection(t1, t2, RelationalTagConnection.TYPE_ENT_TO_TAG) },
					{
						name: 'RelationalTagException',
						type: RelationalTagException.TYPE_WRONG_TYPE
					},
					'tag ent-to-tag tag'
				)
				assert.throws(
					function() { new RelationalTagConnection(t1, ent, RelationalTagConnection.TYPE_TO_TAG_PARENT)},
					{
						name: 'RelationalTagException',
						type: RelationalTagException.TYPE_WRONG_TYPE
					},
					'tag to-tag-parent ent'
				)
				assert.throws(
					function() { new RelationalTagConnection(ent, ent, RelationalTagConnection.TYPE_ENT_TO_TAG) },
					{
						name: 'RelationalTagException',
						type: RelationalTagException.TYPE_WRONG_TYPE
					},
					'ent to-tag ent'
				)
				assert.throws(
					function() { new RelationalTagConnection(t1, ent, RelationalTagConnection.TYPE_ENT_TO_TAG)},
					{
						name: 'RelationalTagException',
						type: RelationalTagException.TYPE_WRONG_TYPE
					},
					'tag to-tag ent'
				)
				assert.throws(
					function() { new RelationalTagConnection(ent, t2, RelationalTagConnection.TYPE_TO_ENT)},
					{
						name: 'RelationalTagException',
						type: RelationalTagException.TYPE_WRONG_TYPE
					},
					'ent to-ent tag'
				)
			})
		})
		
		describe('inverse_type', function() {
			it('works for all connection types', function() {
				let RTC = RelationalTagConnection
				
				assert.equal(RTC.TO_TAG_CHILD, RTC.inverse_type(RTC.TO_TAG_PARENT), 'child-parent')
				assert.equal(RTC.TO_TAG_PARENT, RTC.inverse_type(RTC.TO_TAG_CHILD), 'parent-child')
				assert.equal(
					RTC.TO_TAG_CHILD, 
					RTC.inverse_type(RTC.inverse_type(RTC.TO_TAG_CHILD)), 
					'tag-tag double inverse'
				)
				
				assert.equal(
					RTC.TO_TAG_UNDIRECTED, 
					RTC.inverse_type(RTC.TO_TAG_UNDIRECTED),
					'tag-tag undirected'
				)
				
				assert.equal(RTC.TO_ENT, RTC.inverse_type(RTC.ENT_TO_TAG), 'tag-ent')
				assert.equal(RTC.ENT_TO_TAG, RTC.inverse_type(RTC.TO_ENT), 'ent-tag')
			})
		})
		
		describe('inverse', function() {
			it('works for all connection types', function() {
				let red_apple = rt.connect(rt.get('red'), 'apple')
				let apple_red = red_apple.inverse()
				
				assert.equal(red_apple.type, apple_red.inverse().type, 'tag-ent inverse type')
				assert.ok(red_apple.inverse().equals(apple_red), 'tag-ent inverse connection')
				
				let color_green = rt.connect(
					rt.new('color'), 
					rt.get('green'), 
					RelationalTagConnection.TYPE_TO_TAG_CHILD
				)
				let green_color = color_green.inverse()
				
				assert.equal(color_green.type, green_color.inverse().type, 'parent-child inverse type')
				assert.ok(color_green.inverse().equals(green_color), 'parent-child inverse connection')
				
				color_green.type = RelationalTagConnection.TYPE_TO_TAG_UNDIRECTED
				green_color = color_green.inverse()
				
				assert.equal(color_green.type, green_color.type, 'tag-tag undirected inverse type')
				assert.ok(color_green.inverse().equals(green_color), 'tag-tag undirected inverse connection')
			})
		})
	})
})
