import {getAst} from '../ast'
import {getRelationshipsFromAst} from '../relationship'

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

test('n-1 should work', async () => {
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

//todo: 1-n 1-1 n-n tests, and other edge cases tests

