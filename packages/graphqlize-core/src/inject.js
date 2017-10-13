import type {CurriedFn2, Fn1, CurriedFn3, Fn3, Fn0, Fn2} from './basic-types'
import {plural} from 'pluralize'
import {
	List, prop, capitalize, surround, deCapitalize, K, applySpec, pipe, __, Box, taskTry, concat, I,
	converge, fromPairs, pair, tap, merge, path, either, head, ifElse, join, mapObjIndexed, mergeWith, pathSatisfies,
	pick, take, when, isArray, isObject, values
} from "./util";
import type {ExposeToGraphqlOption, Model, Schema, WholeResolvers, RawBizFunc, ExtractedGraphql} from './types'
import {
	findAll, create, getCreateModelName, getFindAllModelName, getUpdateModelName, update,
	getDeleteModelName, del, getFindOneModelName, findOne, getUpsertModelName, upsert
} from './resolve'
import {getModelConnectorName} from './connector'
import {TYPE_KIND} from "./constants";
import {PER_REQUEST_KEY_NAME} from "injectable-plugin-perrequest";
import {isModelKind} from "./schema";

const modelToFindAllExposeOption : Fn1<Model, ExposeToGraphqlOption>
= pipe(
	prop('name'),
	applySpec({
		name: pipe(capitalize, concat('all'), plural),
		kind: K('query'),
		args: applySpec({
			filter: concat(__, 'Filter'),
			skip: K('Int'),
			take: K('Int'),
			after: K('ID'),
			orderBy: pipe(concat(__, 'OrderByInput'), surround('[', ']'))
		}),
		returns: surround('[', ']')
	})
)

const modelNameToDeleteExposeOption: Fn1<Model, ExposeToGraphqlOption>
= pipe(
	prop('name'),
	applySpec({
		kind: K('mutation'),
		args: applySpec({
			id: K('ID')
		}),
		returns: K('Int')
	})
)

const modelNameToFindOneExposeOption: Fn1<Model, ExposeToGraphqlOption>
= pipe(
	prop('name'),
	applySpec({
		name: capitalize,
		kind: K('query'),
		args: applySpec({
			id: K('ID'),
		}),
		returns: I
	})
)

type CUU = 'create' | 'update' | 'upsert'
const modelToCUUExposeOption : CurriedFn2<CUU, Model, ExposeToGraphqlOption>
= getName => model => Box(model)
.map(prop('name'))
.fold(applySpec({
	kind: K('mutation'),
	args: applySpec({
		input: pipe(getName, capitalize, concat(__, 'Input'))
	}),
	returns: I
}))

const allActions = [
	{
		name: getFindAllModelName,
		injects: [ K('$getDb'), getModelConnectorName, K('getService') ],
		toExposeOption: modelToFindAllExposeOption,
		func: findAll,
	},
	{
		name: getCreateModelName,
		injects: [ K('$getDb'), getModelConnectorName, K('getService') ],
		toExposeOption: modelToCUUExposeOption(getCreateModelName),
		func: create,
	},
	{
		name: getUpdateModelName,
		injects: [ K('$getDb'), getModelConnectorName, K('getService') ],
		toExposeOption: modelToCUUExposeOption(getCreateModelName),
		func: update,
	},
	{
		name: getUpsertModelName,
		injects: [
			pipe(prop('name'), getUpdateModelName),
			pipe(prop('name'), getCreateModelName),
		],
		toExposeOption: modelToCUUExposeOption(getUpsertModelName),
		func: upsert,
	},
	{
		name: getDeleteModelName,
		injects: [ getModelConnectorName],
		toExposeOption: modelNameToDeleteExposeOption,
		func: del,
	},
	{
		name: getFindOneModelName,
		injects: [ getModelConnectorName],
		toExposeOption: modelNameToFindOneExposeOption,
		func: findOne,
	},
]

// GraphqlizeOption -> [Model] -> Task void
export const addBuiltInModelServices = ({option, models, relationships}) => taskTry(
	() => List.of(action => model => Box(model)
		.fold(applySpec({
			name: pipe(prop('name'), action.name),
			func: () => action.func({relationships, models, model}),
			option: applySpec({
				graphql: action.toExposeOption,
				injects: model => List(action.injects)
					.ap(List.of(model))
					.toArray()
			})
		}))
	)
	.ap(List(allActions))
	.ap(List(models).filter(isModelKind(TYPE_KIND.PERSISTENCE)))
	.map(option.core.buildAndAddService)
)

const getName : Fn1<string, Fn1<ExposeToGraphqlOption, string>> = name => ifElse(
	prop('name'),
	prop('name'),
	K(name)
)

const getTypes = ({baseName, kind}) => types => {
	const getSchema = (schemaTypes, typeName) => pipe(
		mapObjIndexed(
			converge(
				(isArray, isObject, columnTypes, columnName) => {
					const baseType = isObject ? `${typeName}${capitalize(columnName)}` : columnTypes
					const type = isArray ? `[${baseType}]` : baseType
					return `${columnName}: ${type}`
				},
				[
					isArray,
					pipe(when(isArray, head), isObject),
					I,
					(_, name) => name
				]
			),
		),
		values,
		x => `${kind} ${typeName} ${ kind === 'type'
			? TYPE_KIND.VALUE_OBJECT
			: ''} { ${ x.join('\n') } }`
	)(schemaTypes)
	
	const schema = getSchema(types, baseName)
	
	const subSchemas = pipe(
		mapObjIndexed(when(isArray, head)),
		pickBy(isObject),
		mapObjIndexed((columnTypes, columnName) => getTypes({
			startName: baseName + capitalize(columnName),
			kind
		})(columnTypes)),
		values
	)(types)
	
	return [...subSchemas, schema]
}

const getInputAndPayloadSchema = name => rawBizFunc => Box(rawBizFunc)
	.map(path(['injectable', 'graphql']))
	.fold(applySpec({
		inputs: ifElse(
			pipe(prop('input'), when(isArray, head), isObject),
			converge(
				(startName, input) => (getTypes({baseName: `${startName}Input`, kind: 'input'})(input)),
				[
					pipe(getName(name), capitalize),
					prop('input'),
				]
			),
			K([])
		),
		types: ifElse(
			pipe(prop('payload'), when(isArray, head), isObject),
			converge(
				(startName, payload) => (getTypes({baseName: `${startName}Payload`, kind: 'type'})(payload)),
				[
					pipe(getName(name), capitalize),
					prop('payload'),
				]
			),
			K([])
		)
	}))

const getSchema : Fn1<{name: string, rawBizFunc: RawBizFunc}, [string]>
=  ({name, rawBizFunc}) => {
	return Box(rawBizFunc)
	.map(path(['injectable', 'graphql']))
	.map(converge(
		(kind, theName, args, returns) => ({
			[kind === 'query' ? 'queries': 'mutations']:
				[`${theName}${args}: ${returns}`]
		}),
		[
			prop('kind'),
			getName(name),
			ifElse(
				prop('input'),
				ifElse(
					pipe(prop('input'), when(isArray, head), isObject),
					pipe(getName, capitalize, concat(__, 'Input'), x => `(input: ${x})`),
					converge((isArray, baseType) => {
						if(isArray) return `(input: [${baseType}])`
						else return `(input: ${baseType})`
					}, [
						pipe(prop('input'), isArray),
						pipe(prop('input'), when(isArray, head)),
					])
				),
				ifElse(
					prop('args'),
					pipe(
						prop('args'),
						mapObjIndexed((type, columnName) => `${columnName}:${type}`),
						values,
						join(','),
						x=>`(${x})`
					),
					K(''),
				),
			),
			ifElse(
				prop('payload'),
				ifElse(
					pipe(prop('payload'), when(isArray, head), isObject),
					pipe(getName, capitalize, concat(__, 'Payload')),
					ifElse(
						pipe(prop('payload'), isArray),
						pipe(prop('payload'), head, surround('[', ']')),
						pipe(prop('payload'))
					)
				),
				pipe(
					prop('returns'),
					ifElse(
						isArray,
						pipe(head, surround('[', ']')),
						I
					)
				)
			)
		]
	))
	.fold(x => {
		const inputAndPayloadSchema = getInputAndPayloadSchema(name)(rawBizFunc)
		return mergeWith(concat, inputAndPayloadSchema, x)
	})
}

const getResolver = ({name, core, rawBizFunc}) => {
	return (_, args, context, _b) => Box(rawBizFunc)
	.map(
		ifElse(
			path(['injectable', 'graphql', 'input']),
			K(args.input),
			K(args)
		)
	)
	.map(merge(pick([PER_REQUEST_KEY_NAME], context || {}))) // 把setup-graphql-server.js文件中的{[PER_REQUEST_KEY_NAME]: req}合并
	.fold(core.getService(name))
}

/*
Basically there two kinds to define a mutation/query, one is args/returns and
the other is input/payloads. The former one will not generate new graphql input/type, while
the latter one will generate new graphql input/type.
 */

type Core = mixed
export const extractGraphql : Fn1<Core, Fn2< string, RawBizFunc, ExtractedGraphql>>
= core => (name, rawBizFunc) => {
	return ({
		schema: getSchema({name, rawBizFunc}),
		resolvers: {
			[
				path(['injectable','graphql', 'kind'], rawBizFunc) === 'query'
					? 'Query'
					: 'Mutation'
			]: {
				[path(['injectable', 'graphql', 'name'], rawBizFunc) || name ]:
					getResolver({name, rawBizFunc, core})}
			}
	})
}

const concatExtractedGraphql: CurriedFn2<ExtractedGraphql, ExtractedGraphql, ExtractedGraphql>
= (a, b)=>({
	schema: mergeWith(concat, a.schema, b.schema),
	resolvers: mergeWith(merge, a.resolvers, b.resolvers)
})

export const extractAllExposedServices : Fn1<Core, ExtractedGraphql>
= core => core.reduce({
		filter: pathSatisfies(I, [1, 'injectable', 'graphql']),
		mapFn: converge(extractGraphql(core), [path([0]), path([1])]),
		reducer: concatExtractedGraphql,
		empty: {schema: {}, resolvers: {}}
	})
