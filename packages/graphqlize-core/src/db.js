import Sequelize from 'sequelize'
import { GraphqlizeOption, Connection, Db} from './types'
import {Box, pipe, props, K, curry, prop, isNil, promiseToTask, Task, map, ifElse, tap, path, taskOf, taskTry} from './util'
import {CurriedFn2, Fn1} from './basic-types'

// GraphqlizeOption -> Task error db
export const initSequelize = option => taskTry(
	() => Box(option)
		.map(prop('connection'))
		.map(props([ 'database', 'username', 'password', 'option' ]))
		.fold(x => new Sequelize(...x))
)

// GraphqlizeOption -> db -> Task
export const registerGetDbService = (option, db) => taskTry(
	() => Box(option)
		.map(prop('core'))
		.fold(core => core.buildAndAddService({
			name: 'getDb',
			func: ({}, _) => db
		}))
)

// GraphqlizeOption -> Db -> Task
export const sync = curry((option, connector) => pipe(
	ifElse(
		pipe(path(['connection', 'option', 'sync']), isNil),
		taskOf,
		pipe(path(['connection', 'option', 'sync']), x => connector.sync(x), promiseToTask)
	),
	map(K(true))
)(option))


