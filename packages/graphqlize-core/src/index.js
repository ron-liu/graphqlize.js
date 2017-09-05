import type {Graphqlize} from './types'
import validate from './validate'
import {mergeSystemSchema} from './schema'
import {schemaToAst} from './ast'
import {extractRelationshipFromAst} from './relationship'
import {mergeOptionWithBuiltInScalars} from './builtin-scalars'
import {initSequelize, sync} from './db'

export const graphqlize : Graphqlize = (option = {}) => {
	const validatedOption = validate(option)
		.map(mergeSystemSchema)
		.map(mergeOptionWithBuiltInScalars) // Success GraphqlizeOption
	
	const ast = validatedOption.chain(schemaToAst) // Ok Ast
	const relationships = ast.chain(extractRelationshipFromAst) // Ok Relationships
	const db = validatedOption.map(initSequelize) // Ok Db
	
	
	
}