import {getModelConnectorName} from './connector'
import {
	promiseToTask, taskRejected, isNil, when, taskOf, taskDo, Box, I, K, notContains,
	__, assoc, ifElse, inc, init, join, last, mapObjIndexed, not, pipe, prop, range, split,
	curry, toPairs, taskifyPromiseFn
} from "./util"
import {queryOperators} from "./schema"
import {applySpec, converge, fromPairs, isEmpty, pair, propEq} from "ramda";
import {FIELD_KIND} from "./constants";
import {getModelRelationships} from "./relationship";
import {List} from 'immutable-ext'

const rejectIfNil = errorMessage => ifElse(
	isNil,
	() => taskRejected(errorMessage),
	taskOf
)

const findAll = ({models, model, relationships}) => async (
	{
		[getModelConnectorName(model)]: getModelConnector,
		getDb,
		getService
	},
	args
) => {
	const modelConnector = await getModelConnector()
	const db = getDb()
	const {filter, orderBy, after, skip, take} = args
	
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
		if (!after) return taskOf()
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
			const ret = value.map(x => getWhereAndInclude(theModel, x))
			return taskOf({
				where: {[op]: ret.map(prop('where'))},
				include: ret.map(prop('include')).reduce(concat, [])
			})
		}
		
		if (fieldOperator === 'AND' || fieldOperator === 'OR') {
			return ofWheresAndConcatIncludes(fieldOperator === 'AND' ? '$and' : '$or')
		}
		
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
									.map(when(equals('like'), K('iLike'))) // 让pg 大小写不敏感
									.map(when(equals('notLike'), K('notILike'))) // 让pg 大小写不敏感
									.fold(concat('$'))
								]: value
						}
					}
				})
			case FIELD_KIND.RELATION:
				const theModelRelationships = getModelRelationships(relationships, theModel.name)
				const {from, to} = theModelRelationships.find(x=>x.from.as === fieldName)
				const getConnectorOfTo = getService({name: `${getModelConnectorName(to.model)}`})
				
				const modelOfTo = models.find(x=>x.name === to.as)
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
	function getWhereAndInclude (theModel, filter) {
		return taskOf(filter)
			.map(toPairs)
			.map(map(applySpec({fieldOperator: path([0]), value: path([1])})))
			.chain(x => List(x)
				.traverse(taskOf, getOperatorWhereAndInclude(theModel))
			)
			.map(reduce(mergeWheresAndConcatIncludes, {}))
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
				.fold(concat(__, [['id', 'Asc']]))
			
		})
	}).run().promise()
}