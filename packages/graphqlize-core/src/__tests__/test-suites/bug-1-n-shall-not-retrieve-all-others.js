import {path} from '../../util'
import {v4} from 'uuid'
const postId1 = v4()
const postId2 = v4()

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
      name: 'should only retrieve postId #1',
      init: {
        Post: [
          {id: postId1, title: '#1', comments: [{content: '#1 comment a'}, {content: '#1 comment b'}]},
          {id: postId2, title: '#2', comments: [{content: '#2 comment c'}]},
        ]
      },
      gqlActs: [
        [
          [`query Post($id: ID) { Post(id:$id) {comments {id content} } }`, null, null, {id: postId1} ],
          path(['Post', 'comments']),  {toHaveLength: 2}
        ],
        [
          [`query Post($id: ID) { Post(id:$id) {comments {id content} } }`, null, null, {id: postId2} ],
          path(['Post', 'comments']),  {toHaveLength: 1}
        ],
      ]
    }
  ]
}
