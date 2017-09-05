import type {Graphqlize} from './types'
import validate from './validate'
import {mergeSystemSchema} from './schema'
import {schemaToAst} from './ast'
import {extractRelationshipFromAst} from './relationship'
import {mergeOptionWithBuiltInScalars} from './builtin-scalars'

export const graphqlize : Graphqlize = (option = {}) => {
	const validatedOption = validate(option)
		.map(mergeSystemSchema)
		.map(mergeOptionWithBuiltInScalars)
	
	// Failure error | Success GraphqlizeOption
	const ast = validatedOption.chain(schemaToAst) // Failure error |  Ok Ast
	const relationships = ast.chain(extractRelationshipFromAst)
	
	
}