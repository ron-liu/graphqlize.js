import {getServer, setupInitData} from '../'
import request from 'supertest'
import {path, tap} from 'ramda'
import {graphql} from 'graphql'

it('with only type', async () => {
	const app = await getServer({
		schemaFilePattern: `${__dirname}/**/*.type.gql`,
		connection: {option: {dialect: 'sqlite', sync: {force: true}}}
	})
	await request(app).post('/graphql')
	.send({
		query:`{allPosts {id title}}`
	})
	.expect(200)
	.then(path(['body', 'data', 'allPosts']))
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

it('setup data should work', async () => {
	const executableSchema = await setupInitData(
		{
			schemaFilePattern: `${__dirname}/**/*.type.gql`,
			connection: {option: {dialect: 'sqlite', sync: {force: true}}}
		},
		{Post: [{title: 'hello'}]}
	)
	const {data: {allPosts}} = await graphql(executableSchema, `{allPosts {title}}`)
	expect(allPosts).toHaveLength(1)
})