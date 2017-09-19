import graphqlize from '..'
import {createCore} from 'injectable-core'

test('whole should work', async () => {
	const option = {
		schema: {
			types: [
				`
				interface Saas {post: Post}
				type Post @persistence {
					content: String
				}
				type Comment implements Saas {
					posts: [Post!]! @relation(name: commentPost)
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