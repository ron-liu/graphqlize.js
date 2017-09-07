import graphqlize from '..'
import {createCore} from 'injectable-core'

test('whole should work', async () => {
	const option = {
		schema: {
			types: [`type Post {
					content: String
				}
			`]
		},
		connection: {
			option: {
				dialect: 'sqlite'
			}
		},
		core: createCore()
	}
	
	const result = await graphqlize(option)
	console.log(result)
})