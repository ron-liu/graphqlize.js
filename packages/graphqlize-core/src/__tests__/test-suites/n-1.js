import {tap, head, prop} from '../../util'
import {v4} from 'uuid'
const commentId = v4()
const postId1 = v4()
const postId2 = v4()

export default {
	types: [`
		type Post {
			id: ID!
			title: String
		}
		type Comment {
			id: ID!
			content: String
			post: Post! @relation(name:"commentPost")
		}
	`],
	cases: [
  
		{
			name: 'gql query parent',
			init: {
				Comment: [
					{content: 'worries', post: {title: 'no'}}
				]
				
			},
			gqlActs: [
				[
					['{allComments {id, post {title}}}'],
					prop('allComments'),
					{toHaveLength:1},
					head,
					prop('post'), {toEqual: {title: 'no'}}
				]
			]
		},
		{
			name: 'create and query',
			init: {
				Comment: [
					{content: 'worries', post: {title: 'no'}},
					{content: 'morning', post: {title: 'good'}},
				]
			},
			acts: [
				['findAllComment', {}, {toHaveLength: 2} ],
				['findAllPost', {}, {toHaveLength: 2} ],
				['findAllComment', {filter: { post: {title: 'no'}}}, {toHaveLength: 1}],
				['findAllComment', {filter: { post: {title_like: '%o%'}}}, {toHaveLength: 2}]
			]
		},
		{
			name: 'update',
			init: {
				Comment: [
					{id: commentId, content: 'worries', post: {id: postId1, title: 'no'}},
				]
			},
			acts: [
				['updateComment', {input: {id: commentId, post: {id: postId1, title: 'yes'}}}, {}],
				['findAllPost', {}, {toHaveLength: 1}, head, {toEqual: expect.objectContaining({id: postId1, title: 'yes'})}]
			]
		},
	]
}