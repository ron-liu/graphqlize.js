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
			arrange: {
				Post: [
					{content: 'hi', likes: 2},
					{content: 'hello', likes: 3},
				]
			},
			act: [
				[
					['findAllPost', { filter: {content: 'hi'} } ]
				],
			],
			assert: [
				{ toHaveLength: 1 }
			]
		}
	]
}