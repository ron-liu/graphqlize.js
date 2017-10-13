import type {Graphqlize} from './types'
import {taskDo, taskAll, taskOf, taskRejected, concat, List, prop, mapObjIndexed, merge} from './util'
import {getOption} from './option'
import {getAst} from './ast'
import {getRelationshipsFromAst} from './relationship'
import {defineSequelize, initSequelize, registerGetDbService, sync} from './db'
import {getModels, registerGetModelInfoService} from './model'
import {buildAndAddGetModelConnectorsServices} from './connector'
import {printJson} from "./util/misc";
import {addBuiltInModelServices, extractAllExposedServices} from "./inject";
import {genModelsInputs, getScalarSchema, schemaToString} from "./schema";
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
		getScalarSchema(validatedOption)
	).reduce(mergeWith(concat), {})
	const resolvers = List.of(
		serviceResolvers,
		mapObjIndexed(prop('resolver'), validatedOption.customerScalars),
		createRelationResolvers({relationships, models, core})
	).reduce(merge, {})
	return taskOf(makeExecutableSchema({
		typeDefs: yield schemaToString(schema),
		resolvers
	}))
})
.orElse(x=>{
	console.log('error caught:', x)
	return taskRejected(x)
})

const graphqlize = option => graphqlizeT(option).run().promise()

export default graphqlize
