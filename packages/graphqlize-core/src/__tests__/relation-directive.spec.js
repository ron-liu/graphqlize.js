import {schemaToAst} from '../ast'
import {extractRelationshipFromAst} from '../relationship'

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

test('n-1 should work', () => {
	const relationships = schemaToAst({types})
		.chain(extractRelationshipFromAst)
		.fold(
			() => {throw new Error('should not have errors')},
			x => expect(x).toEqual([
				{
					from: {multi: true, model: 'Post', as: "comments"},
					to: {multi: false, model: 'Comment'},
				}
			])
		)
})

//todo: 1-n 1-1 n-n tests, and other edge cases tests

