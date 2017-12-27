import {map, prop, head} from '../../util'
import {v4} from 'uuid'
const postId = v4()

export default {
  types: [`
		type Post {
			id: ID
			title: String
			comments: [Comment!] @relation(name: postComments)
 		}
		type Comment {
			id: ID
			content: String
			post: Post @relation(name: postComments)
		}
	`],
  cases: [
    {
      name: 'gql query via 1-n',
      init: {
        Comment: [
          {postId: () => postId, content: 'hi'}
        ],
        Post: [
          {id: postId, title: 'holiday'},
        ],
      },
      gqlActs: [
        [
          ['{allPosts {comments {content}}}'],
          prop('allPosts'), {toHaveLength: 1}, head, prop('comments'), {toHaveLength:1}
        ]
      ]
    }
  ]
}
