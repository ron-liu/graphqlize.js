import type {GraphqlizeOption, Schema, Model, Field, GenModelInputOption, Action} from './types'
import type {Fn1, Fn2, Fn3} from 'basic-types'
import {flatten, mergeWith, over, concat, lensProp, Box, prop, map, when, K, pipe, __, either, capitalize, join, tap} from "./util";
import {List} from 'immutable-ext'

const systemSchema : Schema = {
	types: [
		`enum OrderDirectionEnum { Asc Desc }`,
		`type _QueryMeta @noTable {count: Int!}`,
		`type File @noTable {
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
	if (fieldKind === 'relation') return Box(graphqlizeType).map(capitalize).map(concat(capitalize(action))).fold(concat(__, 'Input'))
	return graphqlizeType
}

const buildInput : Fn3<Action, Model, [string], string>
= (action, model, fields) => `input ${capitalize(action)}${model.name}Input {${fields.join(' ')}}`

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

const genCreateModelInput = genModelInput({allowIdNull: true, allowFieldsOtherThanIdNull: false, action: 'create'})
const genUpdateModelInput = genModelInput({allowIdNull: false, allowFieldsOtherThanIdNull: true, action: 'update'})
const genUpsertModelInput = genModelInput({allowIdNull: true, allowFieldsOtherThanIdNull: true, action: 'upsert'})
const genDeleteModelInput : Fn1<Model, string> = model => buildInput('delete', model, ['id:ID!'])

const genModelInputs : Fn1<Model, [string]>
= model => List.of(genCreateModelInput, genDeleteModelInput, genUpdateModelInput, genUpsertModelInput)
	.ap(List.of(model))
	.toArray()

export const genModelsInputs: Fn1<[Model], [string]>
= models => Box(models)
	.map(map(genModelInputs))
	.fold(flatten)