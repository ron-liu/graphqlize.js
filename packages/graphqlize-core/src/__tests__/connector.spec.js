import Sequelize from 'sequelize'
import {buildAndAddGetModelConnectorsServices} from "../connector";
import {createCore} from 'injectable-core'
import {createSequelize} from './shared'

const sequelize = createSequelize()
const PostModel = sequelize.define('Post', {
	title: Sequelize.STRING,
	comment: Sequelize.STRING
})

const createNewCore = () => {
	const core = createCore()
	core.buildAndAddService({
		name: 'getDb',
		func: ({}, _) => sequelize
	})
	
	return core
}

describe('connector service', () => {
	const core = createNewCore()
	beforeAll(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	test('should be added', async () => {
		await buildAndAddGetModelConnectorsServices({
			option: {
				connectorMiddlewares: [],
				core
			},
			db: sequelize,
			models: [{name: 'Post'}]
		}).run().promise()
		
		const getPostConnector = core.getService('getPostConnector')
		const Post = await getPostConnector()
		await Post.create({title: '#1'})
		const post = await Post.findOne()
		
		expect(post).toEqual(expect.objectContaining({title: '#1'}))
	})
})

describe('connector service with middlewares', () => {
	const core = createNewCore()
	core.buildAndAddService({
		name: 'autoAddComment',
		func: (({}, {model, connector}) => ({
			...connector,
			create: (values, options) => connector.create({...values, comment: 'auto added'}, {...options})
		}))
	})
	beforeAll(async(done) => {
		await sequelize.sync({force: true})
		done()
	})
	test('should be added', async () => {
		await buildAndAddGetModelConnectorsServices({
			option: {
				connectorMiddlewares: ['autoAddComment'],
				core,
			},
			db: sequelize,
			models: [{name: 'Post'}, {name: 'Comment'}]
		}).run().promise()

		const getPostConnector = core.getService('getPostConnector')
		const Post = await getPostConnector()
		await Post.create({title: '#1'})
		const post = await Post.findOne()

		expect(post).toEqual(expect.objectContaining({title: '#1', comment: 'auto added'}))
	})
})
