import {getFiles} from './shared'
import {tap, List, taskOf, task, Map, length, K} from '../util'
import {createCore} from "injectable-core";
import graphqlize from "../index";
import initData from '../init-data'
import {promiseToTask, taskTry} from "../util/hkt";
import {range} from "ramda";
import path from 'path'

const createGraphqlizeOption = (core, types) => ({
	schema: { types},
	connection: {
		option: {
			dialect: 'sqlite',
			sync: {force: true}
		}
	},
	core
})

List(getFiles(`${__dirname}/test-suites/**/*.js`))
.map(file => {
	const suite = require(file).default
	const {types, cases} = suite
	let core
	const runServiceT = ([serviceName, args]) => promiseToTask(core.getService(serviceName)(args))
	const assertT = rules => result => Map(rules)
	.traverse(taskOf, (v, k) => taskTry(() => expect(result)[k](v)))
	
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
			const {arrange, act, assert} = aCase
			return core.getService('initData')(arrange)
			.then(() => List(act)
				.traverse(taskOf, runServiceT)
				.map(xs => xs.findLast(K(true)))
				.chain(assertT(assert))
				.run().promise()
			)
		}))
	})
})
