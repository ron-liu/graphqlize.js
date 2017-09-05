import Sequelize from 'sequelize'
import { GraphqlizeOption, Connection, Db} from './types'
import {pipe, props, K, curry, prop, isNil, promiseToTask, Task, map, ifElse, tap, path, taskOf} from './util'
import {CurriedFn2, Fn1} from './basic-types'

export const initSequelize : Fn1<GraphqlizeOption, Db> = pipe(
	prop('connection'),
	props([ 'database', 'username', 'password', 'option' ]),
	x => new Sequelize(...x)
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
