import {head} from '../../util'
import {v4} from 'uuid'
const commentId1 = v4()
const commentId2 = v4()
const commentId3 = v4()
const postId = v4()

export default {
	types: [`
		type Post {
			id: ID
			title: String
			comments: [Comment!] @relation(name: postComments)
 		}
		type Comment {
			id: ID
			content: String
			post: Post @relation(name: postComments)
		}
	`],
	cases: [
		{
			name: 'query via 1-n',
			init: {
				Post: [
					{title: 'holiday', comments: [{content: 'holiday is good'}, {content: 'holiday is not bad'}]},
					{title: 'study', comments: [{content: 'study is better'}]},
				]
			},
			acts: [
				['findAllComment', {}, {toHaveLength: 3} ],
				['findAllPost', {}, {toHaveLength: 2} ],
				// ['findAllComment', {filter: {post: {title: 'study'}}}, {toHaveLength: 1}] //todo: need friendly error msg
				['findAllPost', {filter: {comments_some: {content_like: 'study%'}}}, {toHaveLength: 1}],
				['findAllPost', {filter: {comments_none: {content_like: '%is%'}}}, {toHaveLength: 0}]
			]
		},
		{
			only: true,
			name: 'update',
			init: {
				Post: [
					{id: postId, title: 'holiday', comments: [
						{content: '1', id: commentId1},
						{content: '2', id: commentId2}
					]},
				]
			},
			acts: [
				['updatePost', {input: {id: postId, comments: [{content: '3'}, {id: commentId2, content: '2+'}]}}, {}],
				['findAllComment', {filter: {postId}}, {toHaveLength: 2}]
			]
		}
	]
}