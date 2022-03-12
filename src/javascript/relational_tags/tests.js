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
	
	// import rt classes into namespace
	const RelationalTag = rt.RelationalTag
	const RelationalTagException = rt.RelationalTagException
	const RelationalTagConnection = rt.RelationalTagConnection
	
	before(function(done) {
		// configure logging
		temp_logger.config({
			level: 'debug',
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
			assert.equal(RelationalTag._is_case_sensitive, false, 'not in case sensitive mode by default')
			assert.throws(
				function() {
					let apple = new RelationalTag('Apple')
					console.log(`warning recreated tag ${apple.name}`)
				},
				exists_exception
			)
		})
	})
	
	describe('module', function() {
		it('has all RelationalTag public members and no private members', function() {
			for (let key of Object.keys(RelationalTag)) {
				let is_private = key.startsWith('_')
				assert.ok(
					(is_private && !(key in rt)) ||
					(!is_private && key in rt)
				)
			}
		})
	})
})
