import Sequelize from 'sequelize'
import { GraphqlizeOption, Connection, Db} from './types'
import {Box, pipe, props, K, curry, prop, isNil, promiseToTask, Task, map, ifElse, tap, path, taskOf, taskTry} from './util'
import {CurriedFn2, Fn1} from './basic-types'

export const initSequelize : Fn1<GraphqlizeOption, Db> = option => taskTry(
	() => Box(option)
		.map(prop('connection'))
		.map(props([ 'database', 'username', 'password', 'option' ]))
		.fold(x => new Sequelize(...x))
)

export const registerGetDbService : CurriedFn2<GraphqlizeOption, Db, void> = {
}

// GraphqlizeOption -> Db -> Task
export const sync = curry((option, connector) => pipe(
	ifElse(
		pipe(path(['connection', 'option', 'sync']), isNil),
		taskOf,
		pipe(path(['connection', 'option', 'sync']), x => connector.sync(x), promiseToTask)
	),
	map(K(true))
)(option))


