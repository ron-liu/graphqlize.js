import type {Graphqlize} from './types'
import {taskDo, taskAll, taskOf, taskRejected} from './util'
import {getOption} from './option'
import {getAst} from './ast'
import {getRelationshipsFromAst} from './relationship'
import {defineSequelizeModels, defineSequelizeRelations, initSequelize, registerGetDbService, sync} from './db'
import {getModels} from './model'
import {buildAndAddGetModelConnectorsServices} from './connector'
import {printJson} from "./util/misc";

const graphqlize : Graphqlize = async (option = {}) => {
	const app = taskDo(function *() {
		const validatedOption = yield getOption(option)
		printJson(validatedOption)
		
		const [db, ast] = yield taskAll([
			initSequelize(validatedOption),
			getAst(validatedOption)
		])
		
		yield registerGetDbService(validatedOption, db)
		const relationships = yield getRelationshipsFromAst(ast)
		const models = yield getModels(ast, validatedOption)
		yield defineSequelizeModels(db, models)
		yield defineSequelizeRelations(db, relationships)
		yield buildAndAddGetModelConnectorsServices({option: validatedOption, db, models})
		
		return taskOf()
	})
	
	return await app
	.orElse(x=>{
		console.log('error caught:', x)
		return taskRejected(x)
	})
	.run()
	.promise()
}

export default graphqlize