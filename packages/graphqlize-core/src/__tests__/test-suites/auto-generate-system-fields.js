import {v4} from 'uuid'
import {prop, map, head} from '../../util'
const id1 = v4()
export default {
  types: [`
		type Post {
			id: ID,
			content: String,
		}
	`],
  cases: [
    {
      name: 'gql query',
      init: {
        Post: [
          {content: 'hello'},
        ]
      },
      gqlActs: [
        [
          ['{allPosts {id createdAt updatedAt}}'],
          prop('allPosts'),
          {toHaveLength: 1},
          head,
          {toHaveProperty: 'createdAt'},
          {toHaveProperty: 'updatedAt'}
        ]
      ]
    },
  
  ]
}