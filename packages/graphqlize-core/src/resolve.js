import {getModelConnectorName, getModelConnectorNameByModelName} from './connector'
import {
	promiseToTask, taskRejected, isNil, when, taskOf, taskDo, Box, I, K, notContains,
	__, assoc, ifElse, inc, init, join, last, mapObjIndexed, not, pipe, prop, range, split,
	curry, toPairs, taskifyPromiseFn, map, path, reduce, keys, concat, equals, filter, merge,
	List, either, both
} from "./util"
import {basicQueryOperators, oneToNQueryOperators} from "./schema"
import {applySpec, converge, fromPairs, isEmpty, pair, pathEq, pathSatisfies, propEq, tap} from "ramda";
import {FIELD_KIND} from "./constants";
import {getModelRelationships} from "./relationship";
import {capitalize} from "./util/misc";
import type {Fn1} from 'basic-types'
import {taskTry} from "./util/hkt";

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
		const ofWheresAndConcatIncludes = op => value => {
			const ret = List(value).traverse(taskOf, x => getWhereAndInclude(theModel, x))
			
			return ret
			.map(x => x.toArray())
			.map(applySpec({
				where: pipe(map(prop('where')), assoc(op, __, {})),
				include: pipe(map(prop('include')), reduce(concat, []))
			}))
		}
		if (fieldOperator === 'AND' || fieldOperator === 'OR') {
			return ofWheresAndConcatIncludes(fieldOperator === 'AND' ? '$and' : '$or')(value)
		}
		
		const fieldName = Box(fieldOperator)
			.fold(ifElse(
				pipe(split('_'), last, notContains(__, keys(basicQueryOperators).concat(oneToNQueryOperators))),
				K(fieldOperator),
				pipe(split('_'), init, join('_'))
			))
		const operator = Box(fieldOperator).map(split('_')).fold(last)
		const theModelRelationships = getModelRelationships(relationships, theModel.name)
		const {isList, fieldKind} = theModel.fields.find(propEq('name', fieldName))
			|| theModelRelationships.find(pathSatisfies(pipe(concat(__, 'Id'), equals(fieldName)), ['from', 'as']))
				? {isList: false, fieldKind: FIELD_KIND.SCALAR} : {}
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
					return getWhereAndInclude(modelOfTo, value)
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
		return taskOf(filter)
		.map(toPairs)
		.map(map(applySpec({fieldOperator: path([0]), value: path([1])})))
		.chain(x => List(x)
			.traverse(taskOf, getOperatorWhereAndInclude(theModel))
		)
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

const fetchNTo1Relationships = (mRelationship, input) => taskOf(mRelationship)
.map(filter(both(path(['from', 'as']), path(['from', 'multi']))))
.map(filter(pipe(path(['from', 'as']), prop(__, input))))

const fetch1ToNRelationships = (mRelationship, input) => taskOf(mRelationship)
.map(filter(both(path(['from', 'as']), path(['to', 'multi']))))
.map(filter(pipe(path(['from', 'as']), prop(__, input))))

const fetch1ToNIdsRelationships = (mRelationship, input) => taskOf(mRelationship)
.map(filter(both(path(['from', 'as']), path(['to', 'multi']))))
.map(filter(pipe(path(['from', 'as']), concat(__, 'Ids'), prop(__, input))))

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
	const createNTo1s = fetchNTo1Relationships(modelRelationships, input)
	.chain(rs => List(rs)
		.traverse(taskOf, ({from, to}) => createSubModelT(to.model, prop(from.as, input))
			.map(x=>({[from.foreignKey]: x.id}))
		)
	)
	.map(reduce(merge, {}))
	
	// itself
	// fields -> Task Model
	const createModel = fields => taskOf(fields)
	.chain(pipe(
		modelConnector.create,
		promiseToTask,
		map(x=>x.get())
	))
	
	// 1-n
	// id -> Task void
	const create1ToNs = id => fetch1ToNRelationships(modelRelationships, input)
	.chain(relationships => List(relationships)
		.traverse(taskOf, ({from, to}) => List(prop(from.as, input))
			.traverse(taskOf, fields => createSubModelT(to.model, {...fields, [from.foreignKey]: id}))
		)
	)
	
	// ids
	// id -> Task void
	const create1ToNIds = id => fetch1ToNIdsRelationships(modelRelationships, input)
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
		const ret = yield createModel({...input, ...ids})
		yield List.of(create1ToNIds, create1ToNs)
			.traverse(taskOf, f => {
				return f(ret.id)
			})
		return taskOf(ret)
	}).run().promise()
}

export const getUpdateModelName : Fn1<string, string> = pipe(capitalize, concat('update'))
export const update =  ({models, model, relationships}) => async (
	{
		[getModelConnectorName(model)]: getModelConnector,
		$getDb,
		getService
	},
	args = {}
) => {
	const modelConnector = await getModelConnector()
	const modelRelationships = getModelRelationships(relationships, model.name)
	const input = args.input
	const {id, ...values} = input
	
	const upsertSubModelT = (modelName, fields) => {
		const isToCreate = ! fields.id
		const service = isToCreate
		? getService({name: getCreateModelName(modelName)})
		: getService({name: getUpdateModelName(modelName)})
		
		return promiseToTask(service({input: fields}))
		.map(isToCreate ? prop('id') : K(fields.id))
	}
	
	const delModelT = (modelName, where) => {
		const toModel = models.find(x=>x.name === modelName)
		const getToModelConnector = getService({name: getModelConnectorName(toModel)})
		
		return promiseToTask(getToModelConnector())
		.chain(x =>x.destroyT({where})
		)
	}
	
	// n-1
	const updateNTo1s = fetchNTo1Relationships(modelRelationships, input)
	.chain(rs => List(rs)
		.traverse(taskOf, ({from, to}) => upsertSubModelT(to.model, prop(from.as, input))
			.map(x=>({[from.foreignKey]: x}))
		)
	)
	.map(reduce(merge, {}))
	
	// itself
	const updateModel = fields => modelConnector.updateT(fields, {where: {id}})
		.chain(() => modelConnector.findOneT({where: {id}}))
	
	// 1-n
	const update1ToNs = () => fetch1ToNRelationships(modelRelationships, input)
	.chain(relationships => List(relationships) //todo: need to delete unmentioned subModels
		.traverse(taskOf, ({from, to}) => {

			const inputFroms = prop(from.as, input)
			const existedIds = inputFroms.filter(prop('id')).map(prop('id'))
			
			return (isEmpty(existedIds)
				? taskOf()
				: delModelT(to.model, {
					[to.foreignKey]: id,
					id: {$notIn: existedIds}
				}))
			.chain(() => List(inputFroms)
				.traverse(taskOf, fields => upsertSubModelT(to.model, {...fields, [from.foreignKey]: id}))
			)
		})
	)
	
	// ids
	// id -> Task void
	const update1ToNIds = () => fetch1ToNIdsRelationships(modelRelationships, input)
	.chain(relationships => List(relationships)
		.traverse(taskOf, ({from, to}) => updateSubModelT(
			to.model,
			{[to.foreignKey]: id},
			{id: {$in: prop(`${from.as}Ids`, input)}}
			)
		)
	)
	
	return taskDo(function * () {
		const ids = yield updateNTo1s
		const ret = yield updateModel({...input, ...ids})
		yield List.of(update1ToNs, update1ToNs)
		.traverse(taskOf, f => {
			return f()
		})
		return taskOf(ret)
	}).run().promise()
}

export const getDeleteModelName : Fn1<string, string> = pipe(capitalize, concat('delete'))
export const del = ({model}) => async (
	{
		[getModelConnectorName(model)]: getModelConnector
	},
	args = {}

) => {
	const {id} = args
	const modelConnector = getModelConnector()
	
}