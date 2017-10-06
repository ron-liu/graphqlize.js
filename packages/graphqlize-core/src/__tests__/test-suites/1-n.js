import {length, add} from '../../util'

export default {
	only: true,
	types: [`
		type Post {
			id: ID
			title: String
			comments: [Comment!] @relation(name: postComments)
 		}
		type Comment {
			id: ID
			content: String
		}
	`],
	cases: [
		{
			name: '1-n',
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
		}
	]
}