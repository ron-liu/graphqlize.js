import {
	taskTry, applySpec, Box, prop, propEq, pipe, filter, evolve, map, path, taskOf, I, curry, concat, keys,
	pathSatisfies, isNil, not, both, pathEq, either, equals, propFn, when, ifElse, propSatisfies, K, any, find, all,
	notEquals, tap, __, contains
} from "./util";
import {Kind} from 'graphql'

const getName = path(['name', 'value'])
const getValue = path(['value', 'value'])
const isKind = propEq('kind')
const isList = either(
	isKind(Kind.LIST_TYPE),
	both(
		isKind(Kind.NON_NULL_TYPE),
		propSatisfies(isKind(Kind.LIST_TYPE), 'type')
	)
)
const stripeList = pipe(
	ifElse(
		isList,
		pipe(
			when(isKind(Kind.NON_NULL_TYPE), prop('type')),
			prop('type')
		),
		I
	)
)

const getGraphqlizeType = propFn('type', pipe(
	stripeList,
	when(isKind(Kind.NON_NULL_TYPE), prop('type')),
	getName
))

export const getModels = (ast, option) => taskTry(() => {
	const {customScalars} = option
	
	const allCustomScalarNames = Box(customScalars)
	.map(keys)
	.fold(concat(['ID', 'String', 'Int', 'Float', 'Boolean']))
	
	const allEnumNames = Box(ast)
	.map(prop('definitions'))
	.map(filter(isKind('EnumTypeDefinition')))
	.fold(map(getName))
	
	const allValueObjectTypes = Box(ast)
	.map(prop('definitions'))
	.map(filter(isKind('ObjectTypeDefinition')))
	.map(filter(propFn('directives', pipe(map(getName), any(equals('valueObject'))))))
	.fold(map(getName))
	
	const allPersistentObjectTypes = Box(ast)
	.map(prop('definitions'))
	.map(filter(isKind('ObjectTypeDefinition')))
	.map(filter(propFn('directives', pipe(
		map(getName),
		all(both(notEquals('valueObject'), notEquals('outSourcing')))
	))))
	.fold(map(getName))
	
	const fieldTypeToFieldKind = ast => typeName => {
		if(contains(typeName, allCustomScalarNames)) return 'scalar'
		else if(contains(typeName, allEnumNames)) return 'enum'
		else if(contains(typeName, allValueObjectTypes)) return 'valueObject'
		else if(contains(typeName, allPersistentObjectTypes)) return 'relation'
		
		return undefined
	}
	
	return Box(ast)
		.map(prop('definitions'))
		.map(filter(isKind('ObjectTypeDefinition')))
		.map(map(applySpec({
			name: getName,
			interfaces: propFn('interfaces', map(getName)),
			directives: propFn('directives', map(applySpec({
				name: getName,
				arguments: pipe(
					prop('arguments'),
					map(applySpec({
						name: getName,
						value: getValue
					}))
				)
			}))),
			modelKind: pipe(
				propFn('directives', map(getName)),
				find(either(equals('valueObject'), equals('outSourcing'))),
				when(isNil, K('persistent'))
			),
			fields: propFn('fields', map(applySpec({
				name: getName,
				allowNullList: propFn('type', pipe(
					both(
						isKind(Kind.NON_NULL_TYPE),
						propSatisfies(isKind(Kind.LIST_TYPE), 'type')
					),
					not
				)),
				isList: propFn('type', isList),
				allowNull: propFn('type', pipe(stripeList, isKind(Kind.NON_NULL_TYPE), not)),
				isSystemField: K(false),
				graphqlizeType: getGraphqlizeType,
				fieldKind: pipe(getGraphqlizeType, fieldTypeToFieldKind(ast)),
				primaryKey: pipe(getName, equals('id'))
			})))
		})))
		.fold(I)


})