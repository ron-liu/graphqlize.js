import {map, prop, head} from '../../util'
import {v4} from 'uuid'
import {OPTIONS_KEY} from 'injectable-core'
const postId = v4()

export default {
  types: [`
		type Post {
			id: ID
			title: String
 		}
	
	`],
  cases: [
    {
      name: 'with OPTIONS_KEY should be all right',
      init: {
        Post: [
          {id: postId, title: 'holiday'},
        ],
      },
      acts: [
        ['findAllPost', {filter: {OPTIONS_KEY: {__perRequestPropertyKey: {a:1}}}}, {toHaveLength: 1}],
        ['findOnePost', { id: postId, OPTIONS_KEY: {__perRequestPropertyKey: {a:1}}}, {toBeDefined: undefined}],
      ]
    }
  ]
}
