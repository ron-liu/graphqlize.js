import type {Graphqlize} from './types'
import {taskDo, taskOf} from './util'
import validate from './validate'
import {mergeSystemSchema} from './schema'
import {getAst} from './ast'
import {getRelationshipFromAst} from './relationship'
import {mergeOptionWithBuiltInScalars} from './builtin-scalars'
import {initSequelize, sync} from './db'

const graphqlize : Graphqlize = async (option = {}) => {
	
	const app = taskDo(function *() {
		const validatedOption = yield validate(option)
			.map(mergeSystemSchema)
			.map(mergeOptionWithBuiltInScalars)
		const db = yield initSequelize(validatedOption)
		const ast = yield getAst(validatedOption)
		return  getRelationshipFromAst(ast)
	})
	
	return await app.run().promise()
}

export default graphqlize