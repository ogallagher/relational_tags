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
			assert.equal(rt.is_case_sensitive(), false, 'not in case sensitive mode')
			
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
				'collision exception on new(name, get_if_exists=false)'
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
	})
	
	describe('graph traversal', function() {
		let apple = 'apple'
		let rock = 'rock'
		
		before(function() {
			console.log('debug reset tags')
			rt.clear()
			
			rt.load({
				'fruit': [],
				'organic': ['fruit']
			})
			
			rt.connect(rt.get('fruit'), apple)
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
