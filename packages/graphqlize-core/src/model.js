import {
	taskTry, applySpec, Box, prop, propEq, pipe, filter, evolve, map, path, taskOf, I, curry, concat, keys,
	pathSatisfies, isNil, not, both, pathEq, either, equals, propFn, when, ifElse, propSatisfies, K, any, find, all,
	notEquals, tap, __, contains, converge, assoc, merge, over, lensProp
} from "./util";
import {Kind} from 'graphql'
import {CustomScalars} from './types'
import Sequelize from 'sequelize'
import type {Field, SequelizeType} from "./types";
import type {Fn1} from "./basic-types";
import {FIELD_KIND, TYPE_KIND} from "./constants";
import {printJson} from "./util/misc";

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

const getGraphqlType = propFn('type', pipe(
	stripeList,
	when(isKind(Kind.NON_NULL_TYPE), prop('type')),
	getName
))

const defaultScalarMappings: CustomScalars = {
	Int: {sequelizeType: Sequelize.INTEGER},
	Float: {sequelizeType: Sequelize.FLOAT},
	String: {sequelizeType: Sequelize.STRING},
	Boolean: {sequelizeType: Sequelize.BOOLEAN},
	ID: {sequelizeType: Sequelize.UUID}
}

export const getModels = (ast, option) => taskTry(() => {
	const customScalars = Box(option)
	.map(prop('customScalars'))
	.fold(merge(defaultScalarMappings))
	
	const allCustomScalarNames = keys(customScalars)
	
	const allEnumNames = Box(ast)
	.map(prop('definitions'))
	.map(filter(isKind('EnumTypeDefinition')))
	.fold(map(getName))
	
	const allValueObjectTypes = Box(ast)
	.map(prop('definitions'))
	.map(filter(isKind('ObjectTypeDefinition')))
	.map(filter(propFn('directives', pipe(map(getName), any(equals(TYPE_KIND.VALUE_OBJECT))))))
	.fold(map(getName))
	
	const allPersistenceObjectTypes = Box(ast)
	.map(prop('definitions'))
	.map(filter(isKind('ObjectTypeDefinition')))
	.map(filter(propFn('directives', pipe(
		map(getName),
		all(both(notEquals(TYPE_KIND.VALUE_OBJECT), notEquals(TYPE_KIND.OUT_SOURCING)))
	))))
	.fold(map(getName))
	
	const fieldTypeToFieldKind = ast => typeName => {
		if(contains(typeName, allCustomScalarNames)) return FIELD_KIND.SCALAR
		else if(contains(typeName, allEnumNames)) return FIELD_KIND.ENUM
		else if(contains(typeName, allValueObjectTypes)) return FIELD_KIND.VALUE_OBJECT
		else if(contains(typeName, allPersistenceObjectTypes)) return FIELD_KIND.RELATION
		
		return undefined
	}
	
	const getSequelizeType : Fn1<Field, SequelizeType> = field => {
		if (field.fieldKind === FIELD_KIND.RELATION) return undefined
		if (field.isList) return Sequelize.JSONB
		if (field.fieldKind === FIELD_KIND.ENUM) return Sequelize.STRING
		if (field.fieldKind === FIELD_KIND.VALUE_OBJECT) return Sequelize.JSONB
		return customScalars[field.graphqlType].sequelizeType
	}
	
	const getDirectives = map(applySpec({
		name: getName,
		arguments: pipe(
			prop('arguments'),
			map(applySpec({
				name: getName,
				value: getValue
			}))
		)
	}))
	
	const systemFields = [
		{
			name: 'createdAt',
			allowNullList: true,
			fieldKind: "scalar",
			graphqlType: 'DateTime',
			sequelizeType: Sequelize.DATE,
			primaryKey: false,
			isList: false,
			allowNull: true,
			isSystemField: true,
			isUnique: false,
		} ,
		{
			name: 'updatedAt',
			allowNullList: true,
			fieldKind: "scalar",
			graphqlType: 'DateTime',
			sequelizeType: Sequelize.DATE,
			primaryKey: false,
			isList: false,
			allowNull: true,
			isSystemField: true,
			isUnique: false,
		}
	]
	
	return Box(ast)
		.map(prop('definitions'))
		.map(filter(isKind('ObjectTypeDefinition')))
		.map(map(over(lensProp('fields'), map(over(lensProp('directives'), getDirectives)))))
		.map(map(applySpec({
			name: getName,
			interfaces: propFn('interfaces', map(getName)),
			directives: propFn('directives', getDirectives),
			modelKind: pipe(
				propFn('directives', map(getName)),
				find(either(equals(TYPE_KIND.VALUE_OBJECT), equals(TYPE_KIND.OUT_SOURCING))),
				when(isNil, K(TYPE_KIND.PERSISTENCE))
			),
			fields: propFn('fields', pipe(
				map(pipe(
					applySpec({
						name: getName,
						allowNullList: propFn('type', pipe(
							both(
								isKind(Kind.NON_NULL_TYPE),
								propSatisfies(isKind(Kind.LIST_TYPE), 'type')
							),
							not
						)),
						isUnique: either(
							propFn('directives', any(propEq('name', 'isUnique'))),
							pipe(getName, equals('id'))
						),
						isList: propFn('type', isList),
						allowNull: propFn('type', pipe(stripeList, isKind(Kind.NON_NULL_TYPE), not)),
						isSystemField: K(false),
						graphqlType: getGraphqlType,
						fieldKind: pipe(getGraphqlType, fieldTypeToFieldKind(ast)),
						primaryKey: pipe(getName, equals('id'))
					}),
					field => ({...field, sequelizeType: getSequelizeType(field)})
				)),
				concat(systemFields)
			))
		})))
		.fold(I)
})

export const registerGetModelInfoService = ({option, relationships, models}) => taskTry(
	() => Box(option)
	.map(prop('core'))
	.fold(core => core.buildAndAddService({
		name: '$getAllModelsInfo',
		func: ({}, _) => ({relationships, models})
	}))
)
