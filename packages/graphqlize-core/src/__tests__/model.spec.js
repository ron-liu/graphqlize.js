import {getModels} from '../model'
import {getAst} from '../ast'
import {propEq} from '../util'

test('model should be ok', async () => {
	const types = [`
	type Person {
		id: ID
		name: String
	}
	`]
	const option = {schema: {types}, customScalar: []}
	const models = await getAst(option)
	.chain(x=>getModels(x, option))
	.run()
	.promise()
	
	expect(models).toHaveLength(1)
	
	const [model] = models
	expect(model.name).toEqual('Person')
	expect(model.interfaces).toEqual([])
	expect(model.directives).toEqual([])
})

test('model interfaces and directives should be ok', async () => {
	const types = [`
	interface Node {id: ID}
	type Person implements Node @outSourcing {
		id: ID
		name: String
	}
	`]
	const option = {schema: {types}, customScalar: []}
	const models = await getAst(option)
	.chain(x=>getModels(x, option))
	.run()
	.promise()
	
	const [model] = models
	expect(model.interfaces).toEqual(['Node'])
	expect(model.directives).toEqual([{name: 'outSourcing', arguments: []}])
})

test('scalar should be ok', async () => {
	const types = [`
	type Person {
		id: ID!
		name: String,
	}
	`]
	const option = {schema: {types}, customScalar: []}
	const models = await getAst(option)
	.chain(x=>getModels(x, option))
	.run()
	.promise()
	
	const [{fields}] = models
	const nameField = fields.find(propEq('name', 'name'))
	const idField = fields.find(propEq('name', 'id'))
	expect(idField).toEqual(expect.objectContaining({
		name: 'id',
		isList: false,
		primaryKey: true,
		allowNull: false,
		isSystemField: false,
		fieldKind: 'scalar',
		graphqlizeType: 'ID',
	}))
	
	expect(nameField).toEqual(expect.objectContaining({
		name: 'name',
		isList: false,
		primaryKey: false,
		allowNull: true,
		isSystemField: false,
		fieldKind: 'scalar',
		graphqlizeType: 'String',
	}))
})

test('enum should be ok', async () => {
	const types = [`
	enum PersonStatus {
		Alive
		Dead
	}
	type Person {
		status: PersonStatus
	}
	`]
	const option = {schema: {types}, customScalar: []}
	const models = await getAst(option)
	.chain(x=>getModels(x, option))
	.run()
	.promise()
	
	const [{fields}] = models
	const statusField = fields.find(propEq('name', 'status'))
	expect(statusField).toEqual(expect.objectContaining({
		name: 'status',
		isList: false,
		primaryKey: false,
		allowNull: true,
		isSystemField: false,
		fieldKind: 'enum',
		graphqlizeType: 'PersonStatus',
	}))
})

test('relation should be ok', async () => {
	const types = [`
	type Person {
		wechat: Wechat
	}
	type Wechat @valueObject {
		name: String
	}
	`]
	const option = {schema: {types}, customScalar: []}
	const models = await getAst(option)
	.chain(x=>getModels(x, option))
	.run()
	.promise()
	
	const wechatModel = models.find(propEq('name', 'Wechat'))
	expect(wechatModel).toEqual(expect.objectContaining({
		modelKind: 'valueObject'
	}))
	
	const personModel = models.find(propEq('name', 'Person'))
	const wechatField = personModel.fields.find(propEq('name', 'wechat'))
	expect(wechatField).toEqual(expect.objectContaining({
		name: 'wechat',
		isList: false,
		primaryKey: false,
		allowNull: true,
		isSystemField: false,
		fieldKind: 'valueObject',
		graphqlizeType: 'Wechat',
	}))
})
