import type {CurriedFn2, Fn1} from './basic-types'
import {plural} from 'pluralize'
import {List, prop, capitalize, surround, deCapitalize, K, applySpec, pipe, __, Box, taskTry, concat} from "./util";
import type {ExposeToGraphqlOption, Model} from './types'
import {findAll, create, getCreateModelName, getFindAllModelName, getUpdateModelName, update} from './resolve'
import {getModelConnectorName} from './connector'
import {converge, fromPairs, pair, tap} from "ramda";
import {I} from "./util/functions";

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
	}
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
