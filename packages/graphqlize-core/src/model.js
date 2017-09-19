import {
	taskTry, applySpec, Box, prop, propEq, pipe, filter, evolve, map, path, taskOf, I, curry, concat, keys,
	pathSatisfies, isNil, not, both, pathEq, either, equals, propFn, when, ifElse, propSatisfies, K, any, find, all,
	notEquals, tap, __, contains, converge, assoc, merge
} from "./util";
import {Kind} from 'graphql'
import {CustomScalars} from './types'
import Sequelize from 'sequelize'
import type {Field, SequelizeType} from "./types";
import type {Fn1} from "./basic-types";

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
	
	const getSequelizeType : Fn1<Field, SequelizeType> = field => {
		if (field.fieldKind === 'relation') return undefined
		if (field.isList) return Sequelize.JSONB
		if (field.fieldKind === 'enum') return Sequelize.STRING
		if (field.fieldKind === 'valueObject') return Sequelize.JSONB
		return customScalars[field.graphqlizeType].sequelizeType
	}
	
	const systemFields = [
		{
			name: 'createdAt',
			allowNullList: true,
			fieldKind: "scalar",
			graphqlizeType: 'DateTime',
			sequelizeType: Sequelize.DATE,
			primaryKey: false,
			isList: false,
			allowNull: true,
			isSystemField: true
		} ,
		{
			name: 'updatedAt',
			allowNullList: true,
			fieldKind: "scalar",
			graphqlizeType: 'DateTime',
			sequelizeType: Sequelize.DATE,
			primaryKey: false,
			isList: false,
			allowNull: true,
			isSystemField: true
		}
	]
	
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
						isList: propFn('type', isList),
						allowNull: propFn('type', pipe(stripeList, isKind(Kind.NON_NULL_TYPE), not)),
						isSystemField: K(false),
						graphqlizeType: getGraphqlizeType,
						fieldKind: pipe(getGraphqlizeType, fieldTypeToFieldKind(ast)),
						primaryKey: pipe(getName, equals('id'))
					}),
					field => ({...field, sequelizeType: getSequelizeType(field)})
				)),
				concat(systemFields)
			))
		})))
		.fold(I)
})