import {Success, Failure, collect} from 'folktale/validation'
import type {GraphqlizeOption} from './types'
import {path, I, ifElse, then, concat, compose, tap, K} from "./util";
import {List} from 'immutable-ext'

const required = name => ifElse(
	I,
	Success,
	()=>Failure([`${name} is required`])
)

const optionRequired = required('option')

const schemaTypesIsRequired = compose(
	required('schema.types'),
	path(['schema', 'types'])
)

const connectionOptionDialectIsRequired = compose(
	required('connection.option.dialect'),
	path(['connection', 'option', 'dialect'])
)

const validators = [
	optionRequired,
	schemaTypesIsRequired,
	connectionOptionDialectIsRequired,
	//todo: only persistent type's field can set @relation directive
]

export default (option: GraphqlizeOption) =>
	List(validators)
	.ap(List.of(option))
	.reduce(concat, Success())
	.map(K(option))
