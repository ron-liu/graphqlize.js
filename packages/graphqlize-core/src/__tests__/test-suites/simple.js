export default {
	types: [`
		type Post {
			content: String,
			likes: Int
		}
	`],
	cases: [
		{
			name: 'findAll',
			init: {
				Post: [
					{content: 'hi', likes: 2},
					{content: 'hello', likes: 3},
				]
			},
			acts: [
				[ 'findAllPost', { filter: {content: 'hi'} } ,  { toHaveLength: 11 } ],
				[ 'findAllPost', { filter: {content: 'nothing'} }, { toHaveLength: 0 } ],
				[ 'findAllPost', { filter: {content_like: 'h%'} }, { toHaveLength: 2 } ],
				[ 'findAllPost', { filter: {content_gte: 'hello'} }, { toHaveLength: 2 } ],
				[ 'findAllPost', { filter: {content_gt: 'hello'} }, { toHaveLength: 1 } ],
				[ 'findAllPost', { filter: {content_lte: 'hello'} }, { toHaveLength: 1 } ],
				[ 'findAllPost', { filter: {content_lt: 'hello'} }, { toHaveLength: 0 } ],
				[ 'findAllPost', { filter: {content_in: ['hi', 'bye']} }, { toHaveLength: 1 } ],
			]
		}
	]
}