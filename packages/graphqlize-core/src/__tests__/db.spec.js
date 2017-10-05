import {getModelsFromTypes, createSequelize} from './shared'
import {defineSequelize, sync} from '../db'
import {promiseToTask} from "../util/hkt";

const prepareDb = async types => {
	const models = await getModelsFromTypes(types)
	const sequelize = createSequelize()
	
	await defineSequelize({db: sequelize, models, relationships: []})
	.chain(() => sync({connection: {option: {sync: {force: true}}}}, sequelize))
	.run()
	.promise()
	
	return sequelize
}

test.only('id should be auto generated', async () => {
	const sequelize = await prepareDb([`
	type Person {
		id: ID
	}
	`])
	const model = await sequelize.model('Person').create({})
	expect(model.id).not.toBeNull()
})

test('isUnique should work', async () => {
	const sequelize = await prepareDb([`
	type Person {
		id: ID
		name: String @isUnique
	}
	`])
	await sequelize.model('Person').create({name: 'ron'})
	await expect(sequelize.model('Person').create({name: 'ron'}))
		.rejects
		.toMatchSnapshot()
})