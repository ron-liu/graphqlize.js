import type {Relationships, Schema, ModelRelationships, Ast} from './types'
import type {Fn1, CurriedFn2} from './basic-types'
import {
	__, pipe, propEq, map, ifElse, I, concat, converge, of2, K, flatten, path, assoc, propSatisfies, lensProp,
	filter, both, either, pathEq, isNil, not, applySpec, prop, tap, curry, when, equals, printJson, any, pick, over,
	all, contains, forEach, find, groupWith, gt, head, length, last, reject, reduce, Box, pathSatisfies, of, isEmpty,
	taskOf
} from './util'
import {TYPE_KIND} from './constants'
import {Failure, Success, collect} from 'folktale/validation'
import Result from 'folktale/result'
import {validationToTask} from "./util/hkt";

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
const getPersistentTypes = pipe(
	prop('definitions'),
	filter(propEq('kind', 'ObjectTypeDefinition')),
	reject(propSatisfies(any(pathSatisfies(contains(__, [TYPE_KIND.OUT_SOURCING, TYPE_KIND.VALUE_OBJECT]), ['name', 'value'])),  'directives')),
	map(pick(['name', 'fields'])),
	map(over(lensProp('name'), prop('value'))),
)

const filterTypesFieldsWithRelationDirective = astTypes => astTypes
	.map(over(lensProp('fields'), filter(
		propSatisfies(any(pathEq(['name', 'value'], 'relation')),  'directives')
	)))
	.filter(propSatisfies(pipe(isEmpty, not), 'fields'))

// AstTypes -> Failure [error] | Success [Field]
const extractTypeFields = astType => Result.of(astType) // Result [AstType]
	.map(prop('fields'))    // Result [AstField]
	.map(tap(x=>console.log(x, 877)))
	.map(map(applySpec({      // [Field]
			objectName: K(astType.name),
			name: path(['name', 'value']),
			type: getBaseTypeFromField,
			isList: isFieldList,
			relationName: field => Box(field.directives)
				.map(find(pathEq(['name', 'value'], 'relation')))
				.map(prop('arguments'))
				.map(find(pathEq(['name', 'value'], 'name')))
				.map(path(['value', 'value']))
				.fold(I)
		}))
	)
	.map(map(ifElse(            //  [Failure [error] | Success [Field] ]
		propSatisfies(isNil, 'relationName'),
		({objectName, name}) => Failure([`${objectName}:${name}，@relation must have name parameter`]),
		pipe(of, Success)
	)))
	.chain(collect)         // Failure [error] | Success [Field]

const extractTypesFields = astTypes => Result.of(astTypes)
	.map(map(extractTypeFields))
	.chain(reduce(concat, Success([])))

const generateRelationship = applySpec({
		from: applySpec({
			multi: pipe(head, prop('isList')),
			model: pipe(head, prop('objectName')),
			as: pipe(head, prop('name'))
		}),
		to: applySpec({
			multi: ifElse(
				pipe(length, equals(1)),
				K(false),
				pipe(last, prop('isList'))
			),
			model: pipe(head, prop('type')),
			as: ifElse(
				pipe(length, equals(1)),
				K(undefined),
				pipe(last, prop('name'))
			)
		})
	})

// Ast -> Validation.Failure | Result.Ok relationships
export const getRelationshipFromAst = ast => taskOf(ast) // Ok ast
	.map(getPersistentTypes)    // Ok [AstType]
	.map(filterTypesFieldsWithRelationDirective) // Ok [AstType]
	.chain(pipe(extractTypesFields, validationToTask))  // Failure [error] | Success [Field]
	.map(groupWith((a, b) => a.relationName === b.relationName)) // Failure [error] | Success [ [Field, Field] ]
	.map(map(generateRelationship))
