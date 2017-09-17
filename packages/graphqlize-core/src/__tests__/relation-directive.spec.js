import {getAst} from '../ast'
import {getModelRelationships, getRelationshipsFromAst} from '../relationship'

test('n-1 should work', async () => {
	const types = [
		`type Post {
		  id: ID
		  name: String,
		  comments: [Comment] @relation(name: "PostComment")
		}`,
		`type Comment {
		  id: ID
		  content: String
		}`
	]
	const relationships = await getAst({schema:{types}})
		.chain(getRelationshipsFromAst)
		.run()
		.promise()
	
	
	expect(relationships).toEqual([
		{
			from: {multi: true, model: 'Post', as: "comments"},
			to: {multi: false, model: 'Comment'},
		}
	])
})


describe ('n-1 1-n should work', () => {
	let relationships
	beforeAll(async done => {
		const types = [
			`type Post {
		  id: ID
		  name: String,
		  comments: [Comment] @relation(name: "PostComment")
		}`,
			`type Comment {
		  id: ID
		  content: String
		  post: Post @relation(name: "PostComment")
		}`
		]
		relationships = await getAst({schema:{types}})
		.chain(getRelationshipsFromAst)
		.run()
		.promise()
		
		done()
	})
	
	test('n-1 1-n should work', async () => {
		expect(relationships).toEqual([
			{
				from: {multi: true, model: 'Post', as: "comments"},
				to: {multi: false, model: 'Comment', as: "post"},
			}
		])
	})
	
	test('getModelRelationship should work', () => {
		expect(getModelRelationships(relationships, 'Comment')).toEqual([
			{
				from: {multi: false, model: 'Comment', as: "post"},
				to: {multi: true, model: 'Post'},
			}
		])
	})
})




//todo: 1-n 1-1 n-n tests, and other edge cases tests
//todo: shall support validation

