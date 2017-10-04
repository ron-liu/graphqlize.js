import type {Relationship, Schema, Ast} from './types'
import type {Fn1, CurriedFn2} from './basic-types'
import {
	__, pipe, propEq, map, ifElse, I, concat, converge, of2, K, flatten, path, assoc, propSatisfies, lensProp,
	filter, both, either, pathEq, isNil, not, applySpec, prop, tap, curry, when, equals, printJson, any, pick, over,
	all, contains, forEach, find, gt, head, length, last, reject, reduce, Box, pathSatisfies, of, isEmpty,
	taskOf, set, lensPath, groupBy, values
} from './util'
import {FIELD_KIND, TYPE_KIND} from './constants'
import {Failure, Success, collect} from 'folktale/validation'
import Result from 'folktale/result'
import {taskTry, validationToTask} from "./util/hkt";
import {sortBy} from "ramda";

const getBaseTypeFromField = pipe(
	prop('type'),
	when(propEq('kind', 'NonNullType'), prop('type')),
	when(propEq('kind', 'ListType'), prop('type')),
	when(propEq('kind', 'NonNullType'), prop('type')),
	path(['name', 'value'])
)

const isFieldList = pipe(
	prop('type'),
	when(propEq('kind', 'NonNullType'), prop('type')),
	propEq('kind', 'ListType'),
)

const validateRelationName = pipe(
	when(
		pipe(length, gt(__, 2)),
		pipe(head, prop('relationName'), y => {throw new Error(`relation:${y} 最多只能施加于2个fields`)})
	),
	when(
		pipe(length, equals(2)),
		when(
			([a,b])=> a.objectName !== b.type || a.type !== b.objectName,
			([a,b]) =>{throw new Error(`同一个relation(name是${a.relationName}), 2个field（${a.objectName}:${a.name}和${b.objectName}:${b.name}）的类型不匹配`)}
		)
	)
)

// Ast -> [Type]
const getPersistenceTypes = pipe(
	prop('definitions'),
	filter(propEq('kind', 'ObjectTypeDefinition')),
	reject(propSatisfies(any(pathSatisfies(contains(__, [TYPE_KIND.OUT_SOURCING, TYPE_KIND.VALUE_OBJECT]), ['name', 'value'])),  'directives')),
	map(pick(['name', 'fields'])),
	map(over(lensProp('name'), prop('value'))),
)

const filterTypesFieldsWithRelationDirective = astTypes => astTypes
	.map(over(lensProp('fields'), filter(
		propSatisfies(any(pathEq(['name', 'value'], FIELD_KIND.RELATION)),  'directives')
	)))
	.filter(propSatisfies(pipe(isEmpty, not), 'fields'))

// AstTypes -> Failure [error] | Success [Field]
const extractTypeFields = astType => Box(astType) // Result [AstType]
	.map(prop('fields'))    // Result [AstField]
	.fold(map(applySpec({      // [Field]
			objectName: K(astType.name),
			name: path(['name', 'value']),
			type: getBaseTypeFromField,
			isList: isFieldList,
			relationName: field => Box(field.directives)
				.map(find(pathEq(['name', 'value'], FIELD_KIND.RELATION)))
				.map(prop('arguments'))
				.map(find(pathEq(['name', 'value'], 'name')))
				.map(path(['value', 'value']))
				.fold(I)
		}))
	)

const extractTypesFields = astTypes => taskTry(
	() => Box(astTypes)
		.map(map(extractTypeFields))
		.fold(flatten)
)

const generateRelationship = applySpec({
		from: applySpec({
			multi: ifElse(
				pipe(length, equals(1)),
				pipe(head, prop('isList'), not),
				pipe(last, prop('isList')),
			),
			model: pipe(head, prop('objectName')),
			as: pipe(head, prop('name'))
		}),
		to: applySpec({
			multi: pipe(head, prop('isList')),
			model: pipe(head, prop('type')),
			as: ifElse(
				pipe(length, equals(1)),
				K(undefined),
				pipe(last, prop('name'))
			)
		})
	})

const addForeignKey = relationship => {
	const {
		from:{multi: fromMulti, as: fromAs, model: fromModelName},
		to: {multi: toMulti, as: toAs, model: toModelName}
	} = relationship
	
	const onFromForeignKey = lensPath(['from', 'foreignKey'])
	const onToForeignKey = lensPath(['to', 'foreignKey'])
	
	// n-n, must be bi-direction
	if (fromMulti && toMulti) {
		return Box(relationship)
			.map(set(onFromForeignKey, `${fromAs}Id`))
			.fold(set(onToForeignKey, `${toAs}Id`))
	}
	
	const foreignKey = !fromMulti
		? (toMulti
			? (toAs ? `${toAs}Id` :  `id_for_${fromModelName}_${fromAs}`) // 1-n
			: (`${fromAs}Id`)
		) // 1-1
		: `${fromAs}Id` // // n-1
	
	return Box(relationship)
		.map(set(onFromForeignKey, foreignKey))
		.fold(set(onToForeignKey, foreignKey))
}

// Ast -> Validation.Failure | Result.Ok relationships
export const getRelationshipsFromAst = ast => taskOf(ast) // Ok ast
	.map(getPersistenceTypes)    // Ok [AstType]
	.map(filterTypesFieldsWithRelationDirective) // Ok [AstType]
	.chain(extractTypesFields)
	.map(groupBy(prop('relationName')))
	.map(values)
	.map(map(sortBy(prop('objectName'))))
	.map(map(generateRelationship))
	.map(map(addForeignKey))

export const getModelRelationships : Fn1<[Relationship], [Relationship]> = (relationships, modelName) => Box(relationships)
	.map(filter(either(pathEq(['from', 'model'], modelName), pathEq(['to', 'model'], modelName))))
	.map(map(when(
		pipe(pathEq(['from', 'model'], modelName), not),
		applySpec({from: prop('to'), to: prop('from')})
	)))
	.fold(map(set(lensPath(['to', 'as']), undefined)))