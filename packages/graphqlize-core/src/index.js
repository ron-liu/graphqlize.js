import type {Graphqlize} from './types'
import {taskDo, taskAll, taskOf} from './util'
import {getOption} from './option'
import {getAst} from './ast'
import {getRelationshipFromAst} from './relationship'
import {initSequelize, registerGetDbService, sync} from './db'

const graphqlize : Graphqlize = async (option = {}) => {
	
	const app = taskDo(function *() {
		const validatedOption = yield getOption(option)
		
		const [db, ast] = yield taskAll([
			initSequelize(validatedOption),
			getAst(validatedOption)
		])
		yield registerGetDbService(validatedOption, db)
		const relationship = yield getRelationshipFromAst(ast)
		return taskOf()
	})
	
	return await app.run().promise()
}

export default graphqlize