import {Box, prop, capitalize, concat, taskTry, taskOf, pick, __, I, values} from './util'
import {List} from 'immutable-ext'

const buildAndAddGetModelConnectorService = ({option, db, model}) => taskTry(
	() => Box(option)
	.map(prop('core'))
	.fold(core => core.buildAndAddService({
		name: Box(model)
			.map(prop('name'))
			.map(capitalize)
			.map(concat('get'))
			.fold(concat(__, 'Connector')),
		
		option: {
			injects: [...option.connectorMiddlewares, 'getDb']
		},
		
		func: async ({getDb, ...middlewares}, _) => {
			const db = getDb()
			let connector = Box(db.model(model.name))
			.fold(model => ({
				findAll: options => model.findAll({...options}),
				findOne: options => model.findOne({...options}),
				destroy: options => model.destroy({...options}),
				update: (values, option) => model.update(values, {...option}),
				create: (values, options) => model.create(values, {...options})
			}))
			for(const middleware of values(middlewares)) {
				connector = await Promise.resolve(middleware({model, connector}))
			}
			return connector
		}
		
	}))
)

export const buildAndAddGetModelConnectorsServices = ({option, db, models}) =>
	List(models)
	.traverse(taskOf, model => buildAndAddGetModelConnectorService({option, db, model}))
