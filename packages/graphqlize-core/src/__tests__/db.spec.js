import {getModelsFromTypes, createSequelize} from './shared'
import {defineSequelizeModels, sync} from '../db'

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
		// .chain(() => sync({connection: {option: {sync: {force: true}}}}, sequelize))
		.run()
		.promise()
	await sequelize.sync({force: true}) // should allow l15 to work
	await sequelize.model('Person').create({name: 'ron'})
	try {
		await sequelize.model('Person').create({name: 'ron'})
		fail('should NOT allow to create same one')
	}
	catch(e) {
	
	}
})