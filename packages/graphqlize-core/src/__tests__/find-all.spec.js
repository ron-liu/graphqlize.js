import graphqlize from '..'
import {createCore} from 'injectable-core'

describe('simple find all', () => {
	const core = createCore()
	
	const option = {
		schema: {
			types: [
				`
				type Post {
					content: String,
					likes: Int
				}
				`]
		},
		connection: {
			option: {
				dialect: 'sqlite',
				sync: {force: true}
			}
		},
		core
	}
	
	beforeAll(async (done) => {
		await graphqlize(option)
		done()
	})
	
	test('work for scalar query condition', async() => {
		const findAllPost = core.getService('findAllPost')
		await findAllPost({filter: {content: '1'}})
	})
	test('work for no condition', async() => {
		const findAllPost = core.getService('findAllPost')
		await findAllPost()
	})
	
})