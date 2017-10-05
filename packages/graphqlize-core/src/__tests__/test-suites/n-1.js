import {length, add} from '../../util'

export default {
	types: [`
		type Post {
			id: ID
			title: String
		}
		type Comment {
			id: ID
			content: String
			post: Post! @relation(name:"commentPost")
		}
	`],
	cases: [
		{
			name: 'n-1',
			init: {
				Comment: [
					{content: 'worries', post: {title: 'no'}},
					{content: 'morning', post: {title: 'good'}},
				]
			},
			acts: [
				['findAllComment', {}, {toHaveLength: 2} ],
				['findAllPost', {}, {toHaveLength: 2} ],
				['findAllComment', {filter: { post: {title: 'no'}}}, {toHaveLength: 1}]
			]
		}
	]
}