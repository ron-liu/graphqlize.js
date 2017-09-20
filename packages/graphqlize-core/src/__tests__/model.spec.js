import {propEq} from '../util'
import Sequelize from 'sequelize'
import {getModelsFromTypes} from './shared'
import {FIELD_KIND, TYPE_KIND} from "../constants";

test('model should be ok', async () => {
	const types = [`
	type Person {
		id: ID
		name: String
	}
	`]
	const models = await getModelsFromTypes(types)
	
	expect(models).toHaveLength(1)
	const [model] = models
	expect(model.name).toEqual('Person')
	expect(model.interfaces).toEqual([])
	expect(model.directives).toEqual([])
})

test('model should have createdAt and updatedAt', async () => {
	const types = [`
	type Person {
		name: String
	}
	`]
	const models = await getModelsFromTypes(types)
	
	const [model] = models
	expect(model.fields).toHaveLength(3)
	expect(model.fields.find(propEq('name', 'createdAt'))).not.toBeNull()
	expect(model.fields.find(propEq('name', 'updatedAt'))).not.toBeNull()
})

test('model interfaces and directives should be ok', async () => {
	const types = [`
	interface Node {id: ID}
	type Person implements Node @outSourcing {
		id: ID
		name: String
	}
	`]
	const models = await getModelsFromTypes(types)
	
	const [model] = models
	expect(model.interfaces).toEqual(['Node'])
	expect(model.directives).toEqual([{name: 'outSourcing', arguments: []}])
})

test('scalar should be ok', async () => {
	const types = [`
	type Person {
		id: ID!
		name: String,
		names: [String]
	}
	`]
	const models = await getModelsFromTypes(types)
	
	const [{fields}] = models
	const nameField = fields.find(propEq('name', 'name'))
	const namesField = fields.find(propEq('name', 'names'))
	const idField = fields.find(propEq('name', 'id'))
	expect(idField).toEqual(expect.objectContaining({
		name: 'id',
		isList: false,
		primaryKey: true,
		allowNull: false,
		isSystemField: false,
		fieldKind: FIELD_KIND.SCALAR,
		graphqlType: 'ID',
		sequelizeType: Sequelize.UUID
	}))
	
	expect(nameField).toEqual(expect.objectContaining({
		name: 'name',
		isList: false,
		primaryKey: false,
		allowNull: true,
		isSystemField: false,
		fieldKind: FIELD_KIND.SCALAR,
		graphqlType: 'String',
		sequelizeType: Sequelize.STRING
		
	}))
	expect(namesField).toEqual(expect.objectContaining({
		name: 'names',
		isList: true,
		primaryKey: false,
		allowNull: true,
		isSystemField: false,
		fieldKind: FIELD_KIND.SCALAR,
		graphqlType: 'String',
		sequelizeType: Sequelize.JSONB
		
	}))
})

test('enum should be ok', async () => {
	const types = [`
	enum PersonStatus {
		Alive
		Dead
	}
	type Person {
		status: PersonStatus,
		statuses: [PersonStatus]
	}
	`]
	const models = await getModelsFromTypes(types)
	
	const [{fields}] = models
	const statusField = fields.find(propEq('name', 'status'))
	const statusesField = fields.find(propEq('name', 'statuses'))
	expect(statusField).toEqual(expect.objectContaining({
		name: 'status',
		isList: false,
		primaryKey: false,
		allowNull: true,
		isSystemField: false,
		fieldKind: FIELD_KIND.ENUM,
		graphqlType: 'PersonStatus',
		sequelizeType: Sequelize.STRING
	}))
	
	expect(statusesField).toEqual(expect.objectContaining({
		name: 'statuses',
		isList: true,
		primaryKey: false,
		allowNull: true,
		isSystemField: false,
		fieldKind: FIELD_KIND.ENUM,
		graphqlType: 'PersonStatus',
		sequelizeType: Sequelize.JSONB
	}))
})

test('valueObject should be ok', async () => {
	const types = [`
	type Person {
		wechat: Wechat,
		wechats: [Wechat]
	}
	type Wechat @valueObject {
		name: String
	}
	`]
	const models = await getModelsFromTypes(types)
	
	const wechatModel = models.find(propEq('name', 'Wechat'))
	expect(wechatModel).toEqual(expect.objectContaining({
		modelKind: TYPE_KIND.VALUE_OBJECT
	}))
	const personModel = models.find(propEq('name', 'Person'))
	const wechatField = personModel.fields.find(propEq('name', 'wechat'))
	const wechatsField = personModel.fields.find(propEq('name', 'wechats'))
	expect(wechatField).toEqual(expect.objectContaining({
		name: 'wechat',
		isList: false,
		primaryKey: false,
		allowNull: true,
		isSystemField: false,
		fieldKind: FIELD_KIND.VALUE_OBJECT,
		graphqlType: 'Wechat',
		sequelizeType: Sequelize.JSONB
	}))
	expect(wechatsField).toEqual(expect.objectContaining({
		name: 'wechats',
		isList: true,
		primaryKey: false,
		allowNull: true,
		isSystemField: false,
		fieldKind: FIELD_KIND.VALUE_OBJECT,
		graphqlType: 'Wechat',
		sequelizeType: Sequelize.JSONB
	}))
})

test('isUnique should work(id should automatically have @isUnique)', async () => {
	const types = [`
	type Person {
		id: ID
		name: String @isUnique
		age: String
	}
	`]
	const [model] = await getModelsFromTypes(types)
	const idField = model.fields.find(propEq('name', 'id'))
	const nameField = model.fields.find(propEq('name', 'name'))
	const ageField = model.fields.find(propEq('name', 'age'))
	
	expect(idField.isUnique).toEqual(true)
	expect(nameField.isUnique).toEqual(true)
	expect(ageField.isUnique).toEqual(false)
})
