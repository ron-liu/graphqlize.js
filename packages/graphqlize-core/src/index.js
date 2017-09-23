import type {Graphqlize} from './types'
import {taskDo, taskAll, taskOf, taskRejected} from './util'
import {getOption} from './option'
import {getAst} from './ast'
import {getRelationshipsFromAst} from './relationship'
import {defineSequelize, initSequelize, registerGetDbService, sync} from './db'
import {getModels} from './model'
import {buildAndAddGetModelConnectorsServices} from './connector'
import {printJson} from "./util/misc";
import {addBuiltInModelServices} from "./inject";

const graphqlize : Graphqlize = async (option = {}) => {
	return taskDo(function *() {
		const validatedOption = yield getOption(option)
		
		const [db, ast] = yield taskAll([
			initSequelize(validatedOption),
			getAst(validatedOption)
		])
		
		const [, relationships, models] = yield taskAll([
			registerGetDbService(validatedOption, db),
			getRelationshipsFromAst(ast),
			getModels(ast, validatedOption)
		])
		
		yield taskAll([
			defineSequelize({db, relationships, models}),
			buildAndAddGetModelConnectorsServices({option: validatedOption, db, models}),
			addBuiltInModelServices(validatedOption, models)
		])
		
		return taskOf()
	})
	.orElse(x=>{
		console.log('error caught:', x)
		return taskRejected(x)
	})
	.run()
	.promise()
}

export default graphqlize
