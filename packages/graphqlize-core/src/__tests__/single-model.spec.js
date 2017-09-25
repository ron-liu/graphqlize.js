import {runTestCases} from './shared'

const testCases = {
	types: [`
		type Post {
			content: String,
			likes: Int
		}
	`],
	cases: [
		{
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

it('should work', async () => {
	await runTestCases(testCases)
})
