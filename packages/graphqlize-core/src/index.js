import type {Graphqlize} from './types'
import validate from './validate'
import {mergeSystemSchema} from './schema'
import {schemaToAst} from './ast'

export const graphqlize : Graphqlize = (option = {}) => {
	const validatedOption = validate(option).map(mergeSystemSchema)
	const ast = validatedOption.chain(schemaToAst)
	
	
}