import {map, prop, head} from '../../util'
import {v4} from 'uuid'
const commentId1 = v4()
const commentId2 = v4()
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
      name: 'no n side, should return empty array',
      init: {
        Comment: [
          {content: '#1'},
          {content: '#2'},
        ],
        Post: [
          {title: 'post 1'}
        ]
      },
      gqlActs: [
        [
          [`query allPosts { allPosts {id, comments {id content} } }` ],
          prop('allPosts'), {toHaveLength: 1},
          head, prop('comments'), {toHaveLength: 0}
        ]
      ]
      
    },
    {
      name: 'gql create with pkids',
      init: {
        Comment: [
          {id: commentId1, content: '#1'},
          {id: commentId2, content: '#2'},
        ]
      },
      gqlActs: [
        [
          [
            `mutation createPost($input: CreatePostInput) {
              createPost(input: $input) {id}
            }`, null, null,
            {input: {id: postId, title: 'I am coming soon', commentsIds: [commentId1, commentId2]}}
          ]
        ],
        [
          [`query allComments($filter: CommentFilter) { allComments(filter:$filter) {id} }`, null, null, {filter: {postId}} ],
          prop('allComments'), {toHaveLength: 2}
        ]
      ]
    },
    {
      name: 'gql create with pkid',
      init: {
        Post: [
          {title: 'I am in little little dumpling restaurant', id: postId}
        ]
      },
      gqlActs: [
        [
          [
            `mutation createComment($input: CreateCommentInput) {
              createComment(input: $input) {id}
            }`, null, null,
            {input: {postId, content: 'I am coming soon'}}
          ]
        ],
        [
          [`query allComments($filter: CommentFilter) { allComments(filter:$filter) {id} }`, null, null, {filter: {postId}} ],
          prop('allComments'), {toHaveLength: 1}
        ]
      ]
    },
		{
			name: 'gql query via 1-n',
			init: {
				Post: [
					{title: 'holiday', comments: [{content: 'good'}, {content: 'better'}]},
				]
			},
			gqlActs: [
				[
					['{allPosts {comments {content}}}'],
					prop('allPosts'), {toHaveLength: 1},
					head, prop('comments'), map(prop('content')), {toEqual: expect.arrayContaining(['good', 'better'])}
				]
			]
		},
		{
			name: 'query via 1-n',
			init: {
				Post: [
					{title: 'holiday', comments: [{content: 'holiday is good'}, {content: 'holiday is not bad'}]},
					{title: 'study', comments: [{content: 'study is better'}]},
				]
			},
			acts: [
				['findAllComment', {}, {toHaveLength: 3} ],
				['findAllPost', {}, {toHaveLength: 2} ],
				// ['findAllComment', {filter: {post: {title: 'study'}}}, {toHaveLength: 1}] //todo: need friendly error msg
				['findAllPost', {filter: {comments_some: {content_like: 'study%'}}}, {toHaveLength: 1}],
				['findAllPost', {filter: {comments_none: {content_like: '%is%'}}}, {toHaveLength: 0}]
			]
		},
		{
			name: 'update sub models',
			init: {
				Post: [
					{id: postId, title: 'holiday', comments: [
						{content: '1', id: commentId1},
						{content: '2', id: commentId2}
					]},
				]
			},
			acts: [
				['updatePost', {input: {id: postId, comments: [{content: '3'}, {id: commentId2, content: '2+'}]}}, {}],
				['findAllComment', {filter: {postId}}, {toHaveLength: 2}, map(prop('content')), { toEqual: expect.arrayContaining(['2+', '3'])}],
			]
		},
		{
			name: 'update sub model ids',
			init: {
				Post: [
					{id: postId, title: 'holiday', comments: [
						{content: '1'}
					]},
				],
				Comment: [
					{content: 'good', id: commentId1},
					{content: 'better', id: commentId2}
				]
			},
			acts: [
				['updatePost', {input: {id: postId, commentsIds: [commentId1, commentId2]}}, {}],
				['findAllComment', {filter: {postId}}, {toHaveLength: 2}, map(prop('content')), { toEqual: expect.arrayContaining(['good', 'better'])}],
			]
		},
		{
			name: 'create sub model ids',
			init: {
				Post: [
					{id: postId, title: 'holiday', commentsIds: () => [commentId1, commentId2]},
				],
				Comment: [
					{content: 'best', id: commentId1},
					{content: 'better', id: commentId2}
				]
			},
			acts: [
				['findAllComment', {filter: {postId}}, {toHaveLength: 2}, map(prop('content')), { toEqual: expect.arrayContaining(['best', 'better'])}],
			]
		}
	]
}
