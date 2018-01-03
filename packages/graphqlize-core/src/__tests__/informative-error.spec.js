import graphqlize from '..'
import {createCore} from 'injectable-core'

test.only('Unknown field type should throw exception',  async () => {
  const option = {
    schema: {
      types: [
        `
				type Comment {
					post: Unknown
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
  
  await expect(graphqlize(option)).rejects.toMatchObject(new Error('Field type "Unknown" is invalid.'));
})

