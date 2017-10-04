import {getAst} from '../ast'
import {getModelRelationships, getRelationshipsFromAst} from '../relationship'
import {List, taskOf} from '../util'
const cases = [
	{ // 1-n
		types: [
			`
			type Post {
				id: ID
				name: String,
				comments: [Comment] @relation(name: "PostComment")
			}
			type Comment {
				id: ID
			}
		`],
		expected: [{
			from: {multi: false, model: 'Post', as: "comments", foreignKey: 'id_for_Post_comments'},
			to: {multi: true, model: 'Comment', foreignKey: 'id_for_Post_comments'},
		}]
	},
	{ // n-1
		types: [
			`
			type Student {
			  id: ID
			  name: String,
			  school: School @relation(name: "SchoolStudent")
			}
			type School {
				id: ID
			}
			
			`],
		expected: [{
			from: {multi: true, model: 'Student', as: "school", foreignKey: 'schoolId'},
			to: {multi: false, model: 'School', foreignKey: 'schoolId'},
		}]
	},
	{ // n-1 and 1-n
		types: [
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
		],
		expected: [{
			to: {multi: false, model: 'Post', as: "comments", foreignKey: 'postId'},
			from: {multi: true, model: 'Comment', as: "post", foreignKey: 'postId'},
		}]
	},
	{ // 1-1
		types: [`
			type User {
			  id: ID
			  account: Account @relation(name: "userAccount")
			}
			type Account {
				id: ID
				user: User @relation(name: "userAccount")
			}
		`],
		expected: [{
			from: {multi: false, model: 'Account', as: "user", foreignKey: 'userId'},
			to: {multi: false, model: 'User', as: "account", foreignKey: 'userId'},
		}]
	}
]

test('should work', async() => {
	await List(cases)
	.traverse(taskOf, ({types, expected}) => getAst({schema:{types}})
		.chain(getRelationshipsFromAst)
		.map(x => expect(x).toEqual(expected))
	).run().promise()
})

//todo: 缺getModelRelationships
