export default {
	types: [`
		type Post {
			content: String,
			likes: Int
		}
	`],
	cases: [
		{
			name: 'simple-query-operator',
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
			]
		}
	]
}