import {getServer} from '../'
import request from 'supertest'
import {path, tap} from 'ramda'

it('with only type', async () => {
	const app = await getServer({
		schemaFilePattern: `${__dirname}/**/*.type.gql`,
		connection: {option: {dialect: 'sqlite', sync: {force: true}}}
	})
	await request(app).post('/graphql')
	.send([{
		query:`{allPosts {id title}}`
	}])
	.expect(200)
	.then(path(['body', 0, 'data', 'allPosts']))
	.then(x=>expect(x).toEqual([]))
})

it('type built in ', async () => {
	const app = await getServer({
		schemaFilePattern: `${__dirname}/**/*.type.gql`,
		serviceFilePattern: `${__dirname}/**/*.biz.js`,
		connection: {option: {dialect: 'sqlite', sync: {force: true}}}
	})
	
	await request(app).post('/graphql')
	.send([{
		query:`query getPosts($input: GetPostsInput) {getPosts(input: $input) {id title}}`,
		variables: {input: {likeName: 'abc'}}
	}])
	.expect(200)
	.then(tap(x=>console.log(JSON.stringify(x.body))))
	.then(path(['body', 0, 'data', 'getPosts']))
	.then(x=>expect(x).toEqual([]))
})