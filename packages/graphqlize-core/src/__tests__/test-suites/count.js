import {v4} from 'uuid'
import {path} from '../../util'
export default {
  types: [`
		type Post {
			id: ID,
			content: String
		}
	`],
  cases: [
    {
      name: 'gql count',
      init: {
        Post: [
          {content: 'hi'},
          {content: 'hello'},
        ]
      },
      gqlActs: [
        [
          ['{_allPostsMeta {count}}'], path(['_allPostsMeta', 'count']), {toEqual: 2}],
      ]
    },
  ]
}