import {v4} from 'uuid'
const id1 = v4()
export default {
	types: [`
		type Post {
			id: ID,
			content: String,
			likes: Int
		}
	`],
	cases: [
		{
			name: 'query',
			init: {
				Post: [
					{content: 'hi', likes: 2},
					{content: 'hello', likes: 3},
				]
			},
			acts: [
				[ 'findAllPost', { filter: {content: 'hi'} } ,  { toHaveLength: 1 } ],
				[ 'findAllPost', { filter: {content: 'nothing'} }, { toHaveLength: 0 } ],
				[ 'findAllPost', { filter: {content_gte: 'hello'} }, { toHaveLength: 2 } ],
				[ 'findAllPost', { filter: {content_gt: 'hello'} }, { toHaveLength: 1 } ],
				[ 'findAllPost', { filter: {content_lte: 'hello'} }, { toHaveLength: 1 } ],
				[ 'findAllPost', { filter: {content_lt: 'hello'} }, { toHaveLength: 0 } ],
				[ 'findAllPost', { filter: {content_in: ['hi', 'bye']} }, { toHaveLength: 1 } ],
				[ 'findAllPost', { filter: {content_in: ['good', 'bad']} }, { toHaveLength: 0 } ],
				[ 'findAllPost', { filter: {content_ne: 'ghost'} }, { toHaveLength: 2 } ],
				[ 'findAllPost', { filter: {content_ne: 'hi'} }, { toHaveLength: 1 } ],
				[ 'findAllPost', { filter: {content_between: ['hello', 'hi']} }, { toHaveLength: 2 } ],
				[ 'findAllPost', { filter: {content_between: ['hellp', 'hh']} }, { toHaveLength: 0 } ],
				[ 'findAllPost', { filter: {content_notBetween: ['hellp', 'hh']} }, { toHaveLength: 2 } ],
				[ 'findAllPost', { filter: {content_notBetween: ['hello', 'hi']} }, { toHaveLength: 0 } ],
				[ 'findAllPost', { filter: {content_notIn: ['hi', 'bye']} }, { toHaveLength: 1 } ],
				[ 'findAllPost', { filter: {content_notIn: ['good', 'bad']} }, { toHaveLength: 2 } ],
				[ 'findAllPost', { filter: {content_like: 'h%'} }, { toHaveLength: 2 } ],
				[ 'findAllPost', { filter: {content_like: 'i%'} }, { toHaveLength: 0 } ],
				[ 'findAllPost', { filter: {content_notLike: 'h%'} }, { toHaveLength: 0 } ],
				[ 'findAllPost', { filter: {content_notLike: 'i%'} }, { toHaveLength: 2 } ],
				[ 'findAllPost', { filter: { AND: [{content_like: 'h%'}, {likes: 2}] }}, { toHaveLength: 1 } ],
				[ 'findAllPost', { filter: { OR: [{content: 'hi'}, {likes: 3}] }}, { toHaveLength: 2 } ],
			]
		},
		{
			name: 'create with id',
			init: {
				Post: [{id: id1, content: 'concert', likes: 99}]
			},
			acts: [
				['findAllPost', {filter: {id: id1}}, {toHaveLength: 1}]
			]
			
		},
		{
			name: "update",
			init: {
				Post: [
					{id: id1, content: 'hi', likes: 2},
					{content: 'hello', likes: 3},
				]
			},
			acts: [
				['updatePost', {input: {id: id1, content: 'hiiii', likes: 3}}, {}],
				['findAllPost', {filter: {content: 'hiiii', likes: 3}}, {toHaveLength: 1}]
			]
		},
		{
			name: "delete",
			init: {
				Post: [
					{id: id1, content: 'hi', likes: 2},
					{content: 'hello', likes: 3},
				]
			},
			acts: [
				['deletePost', {input: {id: id1}}, {}],
				['findAllPost', {}, {toHaveLength: 1}]
			]
		},
	]
}