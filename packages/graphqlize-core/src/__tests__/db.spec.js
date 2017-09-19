import {getModelsFromTypes, createSequelize} from './shared'
import {defineSequelizeModels, sync} from '../db'
import {promiseToTask} from "../util/hkt";

test('isUnique should work', async () => {
	const types = [`
	type Person {
		id: ID
		name: String @isUnique
	}
	`]
	const models = await getModelsFromTypes(types)
	const sequelize = createSequelize()
	
	await defineSequelizeModels(sequelize, models)
		.chain(() => sync({connection: {option: {sync: {force: true}}}}, sequelize))
		.run()
		.promise()
	await sequelize.model('Person').create({name: 'ron'})
	await expect(sequelize.model('Person').create({name: 'ron'}))
		.rejects
		.toMatchSnapshot()
})