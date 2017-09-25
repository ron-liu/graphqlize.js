import Sequelize from 'sequelize'
import {getAst} from '../ast'
import {getModels} from '../model'
import {promiseToTask, taskDo, taskifyPromiseFn, taskOf, Map, List} from "../util";
import {last, range, tap, length} from "ramda";
import {taskTry} from "../util/hkt";
import {K} from "../util/functions";


export const createSequelize = () => new Sequelize('', '', '', { dialect: 'sqlite',})
export const getModelsFromTypes = types => taskOf(types)
	.map(x=>({schema: {types, customerScalars: []}}))
	.chain(getAst)
	.chain(x=>getModels(x, {schema: {types, customerScalars: []}}))
	.run()
	.promise()

export const runTestCases = (core, cases) =>  taskDo(function *() {
	const initData = taskifyPromiseFn(core.getService('initData'))
	const runServiceT = ([serviceName, args]) => promiseToTask(core.getService(serviceName)(args))
	const assertT = rules => result => Map(rules)
	.traverse(taskOf, (v, k) => taskTry(() => expect(result)[k](v)))
	
	return List(cases)
	.traverse(taskOf, ({arrange, act, assert}) => {
			return initData(arrange)
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
