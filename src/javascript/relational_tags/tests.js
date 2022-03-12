/**
 * Relational tags javascript implementation tests.
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
			
			assert.ok(red.name in RelationalTag.all_tags, 'red tag in all tags')
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
			let num_tags = Object.keys(RelationalTag.all_tags).length
			let num_cleared = RelationalTag.clear()
			assert.equal(
				num_tags, 
				num_cleared, 
				`tag count before clear ${num_tags} equals cleared count ${num_cleared}`
			)
			assert.equal(Object.keys(RelationalTag.all_tags).length, 0, 'tag count after clear is 0')
			assert.equal(Object.keys(RelationalTag._tagged_entities).length, 0, 'tagged entity count is 0')
			assert.equal(Object.keys(rt.all_tags).length, 0, 'module tag count after clear is 0')
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
			
			assert.equal(tags.length, Object.keys(rt.all_tags).length, `create ${tags.length} tags`)
			
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
	
	describe.skip('get', function() {
		it('gets existing tags', function() {
			
		})
		
		it('creates new tags with new_if_missing', function() {
			
		})
		
		it('fails to get missing tags', function() {
			
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
			temp_logger.TempLogger.CONSOLE_METHOD['log'](rt.all_tags)
			assert.ok(rt.all_tags[deleted.name] === undefined, `${deleted.name} not in rt.all_tags`)
			assert.ok(RelationalTag.all_tags[deleted.name] === undefined, `${deleted.name} not in RT.all_tags`)
		})
		
		it('fails to delete missing tags quietly', function() {
			let num_tags = Object.keys(rt.all_tags).length
			let missing = rt.new('missing')
			rt.delete(missing)
			
			assert.equal(num_tags, Object.keys(rt.all_tags).length)
		})
	})
	
	describe.skip('connect')
	
	describe.skip('disconnect')
	
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
		
		describe.skip('inverse', function() {
			it('words for all connection types', function() {
				
			})
		})
	})
})
