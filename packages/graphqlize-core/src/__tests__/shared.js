import Sequelize from 'sequelize'
import {getAst} from '../ast'
import {getModels} from '../model'
import {promiseToTask, taskDo, taskifyPromiseFn, taskOf, Map, List} from "../util";
import {last, range, tap, length} from "ramda";
import {taskTry} from "../util/hkt";
import {K} from "../util/functions";
import {createCore} from "injectable-core";
import {graphqlizeT} from "../index";
import initData from '../init-data'


export const createSequelize = () => new Sequelize('', '', '', { dialect: 'sqlite',})
export const getModelsFromTypes = types => taskOf(types)
	.map(x=>({schema: {types, customerScalars: []}}))
	.chain(getAst)
	.chain(x=>getModels(x, {schema: {types, customerScalars: []}}))
	.run()
	.promise()

export const createGraphqlizeOption = (core, types) => ({
	schema: { types},
	connection: {
		option: {
			dialect: 'sqlite',
			sync: {force: true}
		}
	},
	core
})

export const runTestCases = ({types, cases}) =>  taskDo(function *() {
	const core = createCore()
	core.addService('initData', initData)
	const option = createGraphqlizeOption(core, types)
	yield graphqlizeT(option)
	const runServiceT = ([serviceName, args]) => promiseToTask(core.getService(serviceName)(args))
	const assertT = rules => result => Map(rules)
	.traverse(taskOf, (v, k) => taskTry(() => expect(result)[k](v)))
	
	return List(cases)
	.traverse(taskOf, ({arrange, act, assert}) => {
			return taskifyPromiseFn(core.getService('initData'))(arrange)
			.chain(() => {
				return List(range(0, length(act)))
				.traverse(taskOf, i => {
					const aActs = act[i]
					const aAsserts = assert[i]
					return List(aActs)
					.traverse(taskOf, runServiceT)
					.map(xs => xs.findLast(K(true)))
					.chain(assertT(aAsserts))
				})
			})
		}
	)
}).run().promise()
