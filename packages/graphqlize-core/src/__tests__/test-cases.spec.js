import {getFiles} from './shared'
import {
	tap, List, taskOf, task, Map, length, K, prop, any, Box, ifElse, I, filter, map, pipe, over, lensProp, reduce
} from '../util'
import {createCore} from "injectable-core";
import graphqlize from "../index";
import initData from '../init-data'
import {promiseToTask, taskRejected, taskTry} from "../util/hkt";
import {range} from "ramda";
import path from 'path'
import {isArray} from "../util/functions";

const createGraphqlizeOption = (core, types) => ({
	schema: { types},
	connection: {
		option: {
			dialect: 'sqlite',
			storage: 'abc.sqlite3',
			sync: {force: true}
		}
	},
	core
})

Box(getFiles(`${__dirname}/test-suites/**/*.js`))
.map(map(file => ({file, ...require(file).default})))
.map(ifElse(
	any(prop('only')),
	filter(prop('only')),
	I
))
.fold(List)
.map(suite => {
	const {types, cases, file} = suite
	let core
	const runServiceT = ({serviceName, args}) => promiseToTask(core.getService(serviceName)(args))
	const assertT = rules => result => {
		const _assertT = (ruleMap, value) => Map(ruleMap)
			.traverse(taskOf, (v, k) => value.chain( x => taskTry(() => expect(x)[k](v))))
			.chain(K(value))
		
		const reduceFunc = (currentValue, r) => {
			if (typeof r === 'function') return currentValue.map(r)
			else return _assertT(r, currentValue)
		}
		return reduce(reduceFunc, taskOf(result), isArray(rules) ? rules : [rules])
	}
	
	describe(path.basename(file), () => {
		
		beforeAll(async (done) => {
			core = createCore()
			core.addService('initData', initData)
			const option = createGraphqlizeOption(core, types)
			await graphqlize(option)
			done()
		})
		
		List(cases)
		.forEach(aCase => it(aCase.name, async() => {
			const {init, acts} = aCase
			return core.getService('initData')(init)
			.then(() => {
				return List(acts)
				.traverse(taskOf, ([serviceName, args, assert]) => {
					return runServiceT({serviceName, args})
					.chain(assertT(assert))
					.orElse(e => {
						console.error(`test-case Error: ${serviceName} ${JSON.stringify(args)} ${JSON.stringify(assert)}`)
						return taskRejected(e)
					})
				})
				.run().promise()
			})
		}))
	})
})
