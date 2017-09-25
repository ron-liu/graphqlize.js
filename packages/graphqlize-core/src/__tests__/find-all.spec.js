import graphqlize from '..'
import {createCore} from 'injectable-core'
import initData from '../init-data'
import {createGraphqlizeOption, runTestCases} from './shared'

describe('simple find all', () => {
	const core = createCore()
	core.addService('initData', initData)
	
	const types = [`
				type Post {
					content: String,
					likes: Int
				}
				`]
	
	const option = createGraphqlizeOption(core, types)
	
	const testCases = [
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
	
	beforeAll(async done => {
		await graphqlize(option)
		done()
	})
	
	test('should work', async () => {
		await runTestCases(core, testCases)
	})
})