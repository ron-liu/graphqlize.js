import {getFiles} from './shared'
import {
	tap, List, taskOf, task, Map, length, K, prop, any, Box, ifElse, I, filter, map, pipe, over, lensProp,
	reduce, split, startsWith
} from '../util'
import {createCore} from "injectable-core";
import graphqlize from "../index";
import initData from '../init-data'
import {promiseToTask, taskAll, taskDo, taskRejected, taskTry} from "../util/hkt";
import {either, isNil, range} from "ramda";
import path from 'path'
import {isArray, isNotNil} from "../util/functions";
import {graphql} from 'graphql'
import {Op} from "sequelize";

const operatorsAliases = {
  $eq: Op.eq,
  $ne: Op.ne,
  $gte: Op.gte,
  $gt: Op.gt,
  $lte: Op.lte,
  $lt: Op.lt,
  $not: Op.not,
  $in: Op.in,
  $notIn: Op.notIn,
  $is: Op.is,
  $like: Op.like,
  $notLike: Op.notLike,
  $iLike: Op.iLike,
  $notILike: Op.notILike,
  $regexp: Op.regexp,
  $notRegexp: Op.notRegexp,
  $iRegexp: Op.iRegexp,
  $notIRegexp: Op.notIRegexp,
  $between: Op.between,
  $notBetween: Op.notBetween,
  $overlap: Op.overlap,
  $contains: Op.contains,
  $contained: Op.contained,
  $adjacent: Op.adjacent,
  $strictLeft: Op.strictLeft,
  $strictRight: Op.strictRight,
  $noExtendRight: Op.noExtendRight,
  $noExtendLeft: Op.noExtendLeft,
  $and: Op.and,
  $or: Op.or,
  $any: Op.any,
  $all: Op.all,
  $values: Op.values,
  $col: Op.col
};

const createGraphqlizeOption = (core, types) => ({
	schema: { types},
	connection: {
    database: 'snjob',
    username: 'ronliu',
    password: '',
    // option: {
    //   host: 'localhost',
    //   dialect: 'postgres',
    //   // logging: null,
    //   operatorsAliases
    // }
    //
    option: {
			dialect: 'sqlite',
			storage: 'graphqlize.sqlite3',
			sync: {force: true}
		}
	},
	core
})

Box(getFiles(`${__dirname}/test-suites/**/*.js`))
.map(map(file => ({file, ...require(file).default})))
.map(ifElse(
	any(either(prop('only'), pipe(prop('cases'), any(prop('only'))))),
	filter(either(prop('only'), pipe(prop('cases'), any(prop('only'))))),
	I
))
.fold(List)
.map(suite => {
	const {types, cases, file} = suite
	let core, executableSchema
	const runService = ({serviceName, args}) => core.getService(serviceName)(args)
	
	const assertT = (rules, result) => {
		const _assertT = (ruleMap, value) => {
			return Map(ruleMap)
			.traverse(taskOf, (expectedValue, k) =>
				value.chain( x => {
					const check = actualValue => {
						const assert = reduce((ret, y) => ret[y],  expect(actualValue), split('.', k))
						if (isNotNil(expectedValue)) return taskTry(() => assert(expectedValue))
						else return taskTry(() => assert() )
					}
					if (either(startsWith('rejects'), startsWith('resolves'))(k)) {
						return check(x)
					} else {
						return promiseToTask(x).chain(check)
					}
				})
			)
			.chain(K(value))
		}
		
		const reduceFunc = (currentValue, r) => {
			if (typeof r === 'function') return currentValue.map(x=>x.then(r))
			else return _assertT(r, currentValue)
		}
		return reduce(reduceFunc, taskOf(result), isArray(rules) ? rules : [rules])
	}
	
	describe(path.basename(file), () => {
		beforeAll(async (done) => {
			core = createCore()
			core.addService('initData', initData)
			const option = createGraphqlizeOption(core, types)
			executableSchema = await graphqlize(option)
			done()
		})
		
		Box(cases)
		.map(ifElse(
			any(prop('only')),
			filter(prop('only')),
			I
		))
		.fold(List)
		.forEach(aCase => it(aCase.name, async () => {
			const {init, acts = [], gqlActs =[]} = aCase
			return core.getService('initData')(init)
			.then(() => {
				return List(acts)
				.series(taskOf, (caseAct) => {
					const [serviceName, args, ...assert] = caseAct
					const serviceResult =  runService({serviceName, args})
					return taskAll([
						assertT(assert, serviceResult),
						
						// to test rejected promise, we have to swollen rejected promise just make sure it will run acts in order
						promiseToTask(serviceResult.catch(K()))
					])
				})
				.chain(
					() => List(gqlActs)
					.series(taskOf, (caseAct) => {
						const [args, ...assert] = caseAct
						const serviceResult =  graphql(executableSchema, ...args)
						.then(x=>x.errors ? Promise.reject(x.errors[0]) : x)
						.then(prop('data'))
						return taskAll([
							assertT(assert, serviceResult),
							
							// to test rejected promise, we have to swollen rejected promise just make sure it will run acts in order
							promiseToTask(serviceResult.catch(K()))
						])
					})
				)
				.run()
        .promise()
			})
		}))
	})
})
