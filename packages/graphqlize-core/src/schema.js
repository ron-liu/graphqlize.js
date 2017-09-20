import type {GraphqlizeOption, Schema, Model, Field, GenModelInputOption, Action} from './types'
import type {Fn1, Fn2, Fn3, CurriedFn2} from 'basic-types'
import {
	flatten, mergeWith, over, concat, lensProp, Box, prop, map, when, K, pipe, __, either, capitalize, join, tap,
	propEq, ifElse, filter, contains, propSatisfies, I, values
} from "./util"
import {List} from 'immutable-ext'
import {FIELD_KIND, TYPE_KIND} from './constants'
import {mapObjIndexed} from "ramda";
import {joinGraphqlItems} from "./util/misc";

const systemSchema : Schema = {
	types: [
		`enum OrderDirectionEnum { Asc Desc }`,
		`type _QueryMeta @valueObject {count: Int!}`,
		`type File @valueObject {
			id: ID!
			name: String!
			createdAt: DateTime
			updatedAt: DateTime
			size: Int!
			url: String!
			key: String!
		}`
	]
}

export const mergeSystemSchema : Fn1<GraphqlizeOption, GraphqlizeOption> =
	over(lensProp('schema'), mergeWith(concat, systemSchema))

const getFieldInput : Fn1< Action, Fn1<Field, string>>
= action => field => {
	const {fieldKind, graphqlizeType} = field
	if (fieldKind === 'valueObject') return Box(graphqlizeType).map(capitalize).fold(concat(__, 'Input'))
	if (fieldKind === 'relation') return Box(graphqlizeType)
		.map(capitalize)
		.map(concat(capitalize(action === 'create' ? 'create': 'upsert')))
		.fold(concat(__, 'Input'))
	return graphqlizeType
}

const buildInput : Fn3<Action, Model, [string], string>
= (action, model, fields) => `input ${capitalize(action)}${model.name}Input {${joinGraphqlItems(fields)}}`

const getInputField: Fn1<GenModelInputOption, Fn1<Field, string>>
= ({allowIdNull, allowFieldsOtherThanIdNull, action}) => field => {
	const {name, isList, allowNullList, allowNull, fieldKind, graphqlizeType} = field
	return Box(field)
		.map(getFieldInput(action))
		.map(when(
			either(
				K(name !== 'id' && !allowNull),
				K(name === 'id' && !allowIdNull)
			),
			concat(__, '!')
		))
		.map(when(K(isList), pipe(concat('['), concat(__, ']'))))
		.map(when(K(isList && !allowNullList && !allowFieldsOtherThanIdNull), concat(__, '!')))
		.fold(concat(`${name}:`))
}

const genModelInput : Fn2<GenModelInputOption, Model, string>
= option => model => Box(model)
	.map(prop('fields'))
	.map(map(getInputField(option)))
	.fold(x => buildInput(option.action, model, x))

export const queryOperators = {
	gte: I,
	gt: I,
	lt: I,
	lte: I,
	in: x => `[${x}]`,
	ne: I,
	between: x => `[${x}]`,
	notBetween: x => `[${x}]`,
	notIn: x => `[${x}]`,
	like: K('String'),
	notLike: K('String'),
}

const getModelFilterName : Fn1<string, string> = typeName => `${capitalize(typeName)}Filter`
const buildScalarAndEnumColumnFilter : Fn1<Field, [string]> = field => {
	const {name, graphqlizeType} = field
	return Box(queryOperators)
		.map(ifElse(
			K(graphqlizeType === 'ID'),
			K([]),
			pipe(
				mapObjIndexed((getType, opName) => `${name}_${opName}:${getType(graphqlizeType)}`),
				values
			)
		))
		.fold(concat([`${name}:${graphqlizeType}`]))
}
const buildValueObjectColumnFilter: Fn1<Field, [string]> = field => []
const buildRelationColumnFilter: Fn1<Field, [string]> = field => Box(field)
	.fold(ifElse(
		prop('isList'),
		K(['every', 'some', 'none'].map(x => `${field.name}_${x}:${getModelFilterName(field.graphqlizeType)}`)),
		K([
			`${field.name}:${getModelFilterName(field.graphqlizeType)}`,
			`${field.name}Id:ID`
		])
	))

const genCreateModelInput = genModelInput({allowIdNull: true, allowFieldsOtherThanIdNull: false, action: 'create'})
const genUpdateModelInput = genModelInput({allowIdNull: false, allowFieldsOtherThanIdNull: true, action: 'update'})
const genUpsertModelInput = genModelInput({allowIdNull: true, allowFieldsOtherThanIdNull: true, action: 'upsert'})
const genDeleteModelInput : Fn1<Model, string> = model => buildInput('delete', model, ['id:ID!'])
const genModelFieldEnum : Fn1<Model, string> = model => Box(model)
	.map(prop('fields'))
	.map(filter(propSatisfies(contains(__, [FIELD_KIND.SCALAR, FIELD_KIND.ENUM]), 'fieldKind')))
	.map(map(prop('name')))
	.map(joinGraphqlItems)
	.fold(x => `enum ${capitalize(model.name)}FieldEnum {${x}}`)
const getModelFilter : Fn1<Model, string> = model => Box(model)
	.map(prop('fields'))
	.map(map(field => {
		switch (field.fieldKind) {
			case 'relation': return buildRelationColumnFilter(field)
			case 'scalar':
			case 'enum': return buildScalarAndEnumColumnFilter(field)
			case 'valueObject': return buildValueObjectColumnFilter(field)
			default: return []
		}
	}))
	.map(flatten)
	.map(concat([
		`AND:[${getModelFilterName(model.name)}]`,
		`OR:[${getModelFilterName(model.name)}]`
	]))
	.map(joinGraphqlItems)
	.fold(fields => `input ${getModelFilterName(model.name)} {${fields}`)
const genModelOrderByInput : Fn1<Model, string> = model => {
	const name = capitalize(model.name)
	return `input ${name}OrderByInput { column: ${name}FieldEnum, direction: OrderDirectionEnum }`
}

const genValueObjectInput = genModelInput({allowIdNull: true, allowFieldsOtherThanIdNull: true, action: ''})

const genPersistenceModelInputs : Fn1<Model, [string]>
= model => List.of(
		genCreateModelInput, genDeleteModelInput, genUpdateModelInput, genUpsertModelInput,
		genModelFieldEnum, genModelOrderByInput, getModelFilter
	)
	.ap(List.of(model))
	.toArray()

const genValueObjectModelInputs : Fn1<Model, [string]>
= model => List.of(genValueObjectInput)
	.ap(List.of(model))
	.toArray()

const isModelKind: CurriedFn2<string, Model, boolean> = propEq('modelKind')
export const genModelsInputs: Fn1<[Model], [string]>
= models => Box(models)
	.map(filter(either(isModelKind(TYPE_KIND.VALUE_OBJECT), isModelKind(TYPE_KIND.PERSISTENCE))))
	.map(map(ifElse(isModelKind(TYPE_KIND.PERSISTENCE), genPersistenceModelInputs, genValueObjectInput)))
	.fold(flatten)