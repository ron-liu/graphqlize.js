import type {Graphqlize} from './types'
import {taskDo, taskAll, taskOf, taskRejected, concat, List, prop, mapObjIndexed, merge, taskTry} from './util'
import {getOption} from './option'
import {getAst} from './ast'
import {getRelationshipsFromAst} from './relationship'
import {defineSequelize, initSequelize, registerGetDbService, sync} from './db'
import {getModels, registerGetModelInfoService} from './model'
import {buildAndAddGetModelConnectorsServices} from './connector'
import {addBuiltInModelServices, extractAllExposedServices} from "./inject";
import {extendSystemFields, genModelsInputs, getScalarSchema, schemaToString} from "./schema";
import {mergeWith} from "ramda";
import { makeExecutableSchema } from 'graphql-tools'
import {createRelationResolvers} from "./resolve";

export const graphqlizeT : Graphqlize = (option = {}) => taskDo(function *() {
	const {core} = option
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
		registerGetModelInfoService({option: validatedOption, models, relationships}),
		defineSequelize({db, relationships, models, option}),
		buildAndAddGetModelConnectorsServices({option: validatedOption, db, models}),
		addBuiltInModelServices({option: validatedOption, models, relationships})
	])
	const {schema: serviceSchema, resolvers: serviceResolvers} = extractAllExposedServices(core)
	const schema = List.of(
		serviceSchema,
		genModelsInputs(models),
		validatedOption.schema,
    extendSystemFields(models),
		getScalarSchema(validatedOption)
	).reduce(mergeWith(concat), {})
	const resolvers = List.of(
		serviceResolvers,
		mapObjIndexed(prop('resolver'), validatedOption.customScalars),
		createRelationResolvers({relationships, models, core})
	).reduce(merge, {})
  const schemaString = yield schemaToString(schema)
	return taskTry(() => makeExecutableSchema({
		typeDefs: schemaString,
		resolvers
	}))
})
.orElse(x=>{
	console.error('error caught:', x)
	return taskRejected(x)
})

const graphqlize = option => graphqlizeT(option).run().promise()

export default graphqlize

export {default as initData} from './init-data'
