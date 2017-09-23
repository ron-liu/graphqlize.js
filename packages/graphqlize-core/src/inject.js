import type {CurriedFn2, Fn1} from './basic-types'
import {plural} from 'pluralize'
import {prop, capitalize, surround, deCapitalize, K, applySpec, pipe, __, Box, taskTry, concat} from "./util";
import type {ExposeToGraphqlOption, Model} from './types'
import {findAll} from './resolve'
import {getModelConnectorName} from './connector'
import {List} from 'immutable-ext'
import {tap} from "ramda";

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

const allActions = [
	{
		name: pipe(prop('name'), capitalize, concat('findAll')),
		injects: [ K('getDb'), getModelConnectorName, K('getService') ],
		toExposeOption: modelToFindAllExposeOption,
		func: findAll,
	}
]

// GraphqlizeOption -> [Model] -> Task void
export const addBuiltInModelServices = ({option, models, relationships}) => taskTry(
	() => List.of(action => model => Box(model)
		.fold(applySpec({
			name: action.name,
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
