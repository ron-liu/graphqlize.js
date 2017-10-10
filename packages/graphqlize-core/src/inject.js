import type {CurriedFn2, Fn1} from './basic-types'
import {plural} from 'pluralize'
import {
	List, prop, capitalize, surround, deCapitalize, K, applySpec, pipe, __, Box, taskTry, concat, I,
	converge, fromPairs, pair, tap
} from "./util";
import type {ExposeToGraphqlOption, Model} from './types'
import {
	findAll, create, getCreateModelName, getFindAllModelName, getUpdateModelName, update,
	getDeleteModelName, del, getFindOneModelName, findOne, getUpsertModelName, upsert
} from './resolve'
import {getModelConnectorName} from './connector'

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
			orderBy: pipe(concat(__, 'OrderBy'), surround('[', ']'))
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
		input: pipe(getName, concat(__, 'Input'))
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
	.ap(List(models))
	.map(option.core.buildAndAddService)
)
