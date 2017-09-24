import {
	Box, prop, capitalize, concat, taskTry, taskOf, pick, __, I, values, mapObjIndexed, over, lensPath,
	toPairs, map, taskifyPromiseFn, fromPairs, List
} from './util'
import SequelizeModel from 'sequelize/lib/model'
import {omit} from "ramda";

export const getModelConnectorName = model => Box(model)
	.map(prop('name'))
	.map(capitalize)
	.map(concat('get'))
	.fold(concat(__, 'Connector'))

const buildAndAddGetModelConnectorService = ({option, db, model}) => taskTry(
	() => Box(option)
	.map(prop('core'))
	.fold(core => core.buildAndAddService({
		name: getModelConnectorName(model),
		option: {
			injects: [...option.connectorMiddlewares, '$getDb']
		},
		
		func: async ({$getDb, ...middlewares}, _) => {
			const db = $getDb()
			let connector = Box(db.model(model.name))
			.fold(model => ({
				findAll: options => model.findAll({...options}).then(map(x=>x.get())),
				findOne: options => model.findOne({...options}).then(x=>x && x.get()),
				destroy: options => model.destroy({...options}),
				update: (values, option) => model.update(values, {...option}),
				upsert: (values, option) => model.upsert(values, {...option}),
				create: (values, options) => model.create(values, {...options}),
				getSelectQuery: options => {
					if (options.include) {
						SequelizeModel._validateIncludedElements.bind(connector)(options)
					}
					return db.dialect.QueryGenerator
						.selectQuery(connector.tableName, options, connector)
						.slice(0,-1)
				}
			}))
			for(const middleware of values(middlewares)) {
				connector = await Promise.resolve(middleware({model, connector}))
			}
			
			// build a object with task based object, like: {findAllT, findOneT, ...}
			const taskifiedConnector = Box(connector)
				.map(omit(['getSelectQuery']))
				.map(mapObjIndexed(taskifyPromiseFn))
				.map(toPairs)
				.map(map(over(lensPath([0]), concat(__, 'T'))))
				.fold(fromPairs)
			
			return {
				...connector,
				...taskifiedConnector,
			}
		}
	}))
)

export const buildAndAddGetModelConnectorsServices = ({option, db, models}) =>
	List(models)
	.traverse(taskOf, model => buildAndAddGetModelConnectorService({option, db, model}))
