import {getModelConnectorName, getModelConnectorNameByModelName} from './connector'
import {
	promiseToTask, taskRejected, isNil, when, taskOf, taskDo, Box, I, K, notContains,
	__, assoc, ifElse, inc, init, join, last, mapObjIndexed, not, pipe, prop, range, split,
	curry, toPairs, taskifyPromiseFn, map, path, reduce, keys, concat, equals, filter, merge,
	List, either, both
} from "./util"
import {queryOperators} from "./schema"
import {applySpec, converge, fromPairs, isEmpty, pair, pathEq, propEq, tap} from "ramda";
import {FIELD_KIND} from "./constants";
import {getModelRelationships} from "./relationship";
import {capitalize} from "./util/misc";
import type {Fn1} from 'basic-types'

const rejectIfNil = errorMessage => ifElse(
	isNil,
	() => taskRejected(errorMessage),
	taskOf
)

export const getFindAllModelName : Fn1<string, string> = pipe(capitalize, concat('findAll'))
export const findAll = ({models, model, relationships}) => async (
	{
		[getModelConnectorName(model)]: getModelConnector,
		$getDb,
		getService
	},
	args = {}
) => {
	const modelConnector = await getModelConnector()
	const db = $getDb()
	const {filter, orderBy = [], after, skip, take} = args
	
	// args -> Task Where
	// [{column: 'name', direction: 'ASC'}, {column: 'age', direction: 'DESC'}]
	// return:
	// {
	//  $or: [
	//      {name: {$gt: currentOne.name}},
	//      {name: currentOne.name, age: {$lt: currentOne.age}},
	//      {name: currentOne.name, age: currentOne.age, id: {$gt: currentOne.id}}
	// ]
	// }
	const getCursorWhere = after => taskDo(function *() {
		if (!after) return taskOf({})
		const currentOne = yield modelConnector.findOneT({where: {id: after}})
			.chain(rejectIfNil(`In findAll, the argument 'after' points to invalid ID(${after})`))
		
		return taskOf(orderBy)     // Box [{column: 'name', direction: 'ASC'}, {column: 'age', direction: 'DESC'}]
			.map(pipe(length, inc, range(0))) // [0, 1, 2]
			.map(map(inc, range(0))) // [ [0], [0, 1], [0, 1, 2] ]
			.map(map(x => {     // x = [0], [0, 1], [0, 1, 2] sequentially
				const len = length(x)
				const orderByLen = length(orderBy)
				
				const eqs = Box(orderBy) // {name: currentOne.name}
					.map(take(len - 1))
					.map(map(y => ({[y.column]: currentOne[y.column]})))
					.fold(merge)
				
				const gts = Box(orderBy)
					.map(ifElse(
						() => len > orderByLen,
						() => ({ id: {$gt: currentOne.id }}),
						() => {
							const {column, direction} = last(orderBy)
							return {
								[column]: {
									[direction === 'Asc' ? '$gt' : '$lt']: currentOne[column]
								}
							}
						}
					))
				
				return merge(eqs, gts)
			}))
			.map(assoc('$or', __, {}))
	})
	
	const mergeWheresAndConcatIncludes
		= ({where : whereA = {} , include: includeA = []}, {where : whereB = {}, include : includeB = []}) => ({
		where: {...whereA, ...whereB},
		include: [...includeA, ...includeB]
	})
	
	// {operator, value} -> Task WhereAndInclude
	const getOperatorWhereAndInclude = theModel => ({fieldOperator, value}) => {
		console.log(1110, 0)
		const ofWheresAndConcatIncludes = op => value => {
			const ret = value.map(x => getWhereAndInclude(theModel, x))
			return taskOf({
				where: {[op]: ret.map(prop('where'))},
				include: ret.map(prop('include')).reduce(concat, [])
			})
		}
		
		if (fieldOperator === 'AND' || fieldOperator === 'OR') {
			return ofWheresAndConcatIncludes(fieldOperator === 'AND' ? '$and' : '$or')
		}
		
		console.log(1110, 1)
		const fieldName = Box(fieldOperator)
			.fold(ifElse(
				pipe(split('_'), last, notContains(__, keys(queryOperators))),
				K(fieldOperator),
				pipe(split('_'), init, join('_'))
			))
		const operator = Box(fieldOperator).map(split('_')).fold(last)
		const {isList, fieldKind, graphqlType} = theModel.fields.find(propEq('name', fieldName))
		switch (fieldKind) {
			case FIELD_KIND.ENUM:
			case FIELD_KIND.SCALAR:
				if (fieldName === fieldOperator) return taskOf({where: {[fieldOperator]: value}})
				return taskOf({
					where: {
						[fieldName]: {
							[
								Box(operator)
									// .map(when(equals('like'), K('iLike'))) // 让pg 大小写不敏感
									// .map(when(equals('notLike'), K('notILike'))) // 让pg 大小写不敏感
									.fold(concat('$'))
								]: value
						}
					}
				})
			case FIELD_KIND.RELATION:
				const theModelRelationships = getModelRelationships(relationships, theModel.name)
				const {from, to} = theModelRelationships.find(x=>x.from.as === fieldName)
				const getConnectorOfTo = getService({name: `${getModelConnectorNameByModelName(to.model)}`})
				
				const modelOfTo = models.find(x=>x.name === to.model)
				if (isList) { // 1-n
					return taskDo(function *() {
						const connectorOfTo = yield taskifyPromiseFn(getConnectorOfTo)()
						const subSql = yield getWhereAndInclude(modelOfTo, value)
							.map(option => connectorOfTo.getSelectQuery({...option, attributes: [to.foreignKey]}))
							
						return taskOf({ where: { id: {
							[ operator === 'some' ? '$in' : '$notIn']:
								db.literal(`(${subSql})`)
						} } })
					})
				} else {
					const sequelizeModel = db.model(to.model)
					console.log(1111, 1)
					return getWhereAndInclude(modelOfTo, value)
					.map(tap(x=>console.log(1111, 3, x)))
					.map(({where, include}) => {
						return {
							where: Box(where)
								.map(toPairs)
								.map(map(([name, value])=> [
									`$${from.as}.${name.replace('$', '')}$`,
									value
									]
								))
								.fold(fromPairs),
							include: [{model: sequelizeModel, as: from.as, include }]
						}
					})
				}
				
			default: return taskOf({})
		}
	}
	
	// (Models, Model) -> filter -> sequelize's where
	function getWhereAndInclude (theModel, filter={}) {
		console.log(2222, 1)
		return taskOf(filter)
		.map(toPairs)
		.map(map(applySpec({fieldOperator: path([0]), value: path([1])})))
		.map(tap(x=>console.log(1234, 5, x)))
		.chain(x => List(x)
			.traverse(taskOf, getOperatorWhereAndInclude(theModel))
		)
		.map(tap(x=>console.log(1234, 6, x)))
		.map(reduce(mergeWheresAndConcatIncludes, {where: {}, include: []}))
	}
	
	return taskDo(function * () {
		const cursorWhere = yield getCursorWhere(after)
		const {where, include} = yield getWhereAndInclude(model, filter)
		return modelConnector.findAllT({
			where: {...cursorWhere, ...where},
			include,
			offset: skip,
			limit: take,
			order: Box(orderBy)
				.map(map(converge(pair, [prop('column'), prop('direction')])))
				.fold(when(K(after), concat(__, [['id', 'Asc']])))
			
		})
	}).run().promise()
}

export const getCreateModelName : Fn1<string, string> = pipe(capitalize, concat('create'))
export const create =  ({models, model, relationships}) => async (
	{
		[getModelConnectorName(model)]: getModelConnector,
		$getDb,
		getService
	},
	args = {}
) => {
	const input = args.input
	const modelRelationships = getModelRelationships(relationships, model.name)
	const modelConnector = await getModelConnector()
	const db = $getDb()
	
	const createSubModelT = (modelName, fields) => {
		const service = getService({name: getCreateModelName(modelName)})
		return promiseToTask(service({input: fields}))
	}
	
	const updateSubModelT = (modelName, fields, where) => {
		const connector = getService({name: getModelConnectorName(modelName)})
		return connector.updateT(fields, {where})
	}
	
	// n-1, create all n-1 relationship models and merge fk ids back to input
	// Task {[fkId]: ID}
	const createNTo1s = taskOf(modelRelationships)
	.map(filter(path(['from', 'multi'])))
	.map(filter(pipe(path(['from', 'as']), prop(__, input))))
	.chain(rs => List(rs)
		.traverse(taskOf, ({from, to}) => createSubModelT(to.model, prop(from.as, input))
			.map(x=>({[from.foreignKey]: x.id}))
		)
	)
	.map(reduce(merge, {}))
	
	// itself
	// fields -> Task Model
	const createModel = fields => taskOf(fields)
	.map(tap(x=>console.log(8889, x)))
	.chain(pipe(
		modelConnector.create,
		promiseToTask,
		map(x=>x.get())
	))
	
	// 1-n
	// id -> Task void
	const create1ToNs = id => taskOf(modelRelationships)
	.map(filter(both(path(['from', 'as']), path(['to', 'multi']))))
	.map(filter(pipe(path(['from', 'as']), prop(__, input))))
	.chain(relationships => List(relationships)
		.traverse(taskOf, ({from, to}) => List(prop(from.as, input))
			.traverse(taskOf, fields => createSubModelT(to.model, fields))
		)
	)
	
	// ids
	// id -> Task void
	const create1ToNIds = id => taskOf(modelRelationships)
	.map(filter(both(path(['from', 'as']), path(['to', 'multi']))))
	.map(filter(pipe(path(['from', 'as']), concat(__, 'Ids'), prop(__, input))))
	.chain(relationships => List(relationships)
		.traverse(taskOf, ({from, to}) => updateSubModelT(
			to.model,
			{[to.foreignKey]: id},
			{id: {$in: prop(`${from.as}Ids`, input)}}
			)
		)
	)
	
	return taskDo(function * () {
		const ids = yield createNTo1s
		console.log(8888, ids)
		const ret = yield createModel({...input, ...ids})
		yield List.of(create1ToNIds, create1ToNs)
			.traverse(taskOf, f => {
				return f(ret.id)
			})
		return taskOf(ret)
	}).run().promise()
}

export const getUpdateModelName : Fn1<string, string> = pipe(capitalize, concat('update'))
