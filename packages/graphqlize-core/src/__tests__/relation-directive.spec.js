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

test('', () => {
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

