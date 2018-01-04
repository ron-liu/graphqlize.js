import {injectable} from 'injectable-core'

export const getPosts = injectable({
	name: 'getPosts',
	injects: ['findAllPost'],
	graphql: {
		name: 'getPosts',
		kind: 'query',
		input: {likeName: 'String'},
		payload: ['Post']
	}
})((
	{findAllPost},
	args
) => {
	const {likeName} = args
	return findAllPost({filter: {likeName}})
})

export const getMyPost = injectable({
  name: 'getMyPost',
  injects: ['getPerRequestContext'],
  graphql: {
    name: 'getMyPost',
    kind: 'query',
    payload: 'Post'
  }
})((
  {getPerRequestContext},
  args
) => {
  const title = getPerRequestContext({name: 'title'})
  return {title}
})