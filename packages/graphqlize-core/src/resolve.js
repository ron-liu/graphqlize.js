import {getModelConnectorName, getModelConnectorNameByModelName} from './connector'
import {
  promiseToTask, taskRejected, isNil, when, taskOf, taskDo, Box, I, K, notContains,
  __, assoc, ifElse, inc, init, join, last, mapObjIndexed, not, pipe, prop, range, split,
  curry, toPairs, taskifyPromiseFn, map, path, reduce, keys, concat, equals, filter, merge, omit,
  List, either, both, reject, applySpec, converge, fromPairs, isEmpty, pair, pathEq, pathSatisfies, propEq, tap,
  capitalize, taskTry, pick, surround
} from "./util"
import {basicQueryOperators, oneToNQueryOperators} from "./schema"
import {FIELD_KIND} from "./constants"
import {getModelRelationships} from "./relationship"
import type {Fn1} from 'basic-types'
import {OPTIONS_KEY} from 'injectable-core'
import {lensProp, over} from "ramda";


const rejectIfNil = errorMessage => ifElse(
	isNil,
	() => taskRejected(errorMessage),
	taskOf
)


const queryAll = (kind: 'findAll' | 'meta') => ({models, model, relationships}) => async (
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
			|| (
			  theModelRelationships
        .filter(path(['from', 'as']))
        .find(pathSatisfies(pipe(concat(__, 'Id'), equals(fieldName)), ['from', 'as']))
				? {isList: false, fieldKind: FIELD_KIND.SCALAR}
				: {}
				)
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
		return kind === 'findAll'
      ? modelConnector.findAllT({
        where: {...cursorWhere, ...where},
        include,
        offset: skip,
        limit: take,
        order: Box(orderBy)
          .map(map(converge(pair, [prop('column'), prop('direction')])))
          .fold(when(K(after), concat(__, [['id', 'Asc']])))
        
      })
      : modelConnector.findOneT({
        where: {...cursorWhere, ...where},
        raw: true,
        attributes: [[db.fn('count',1), 'count']]
      })
	}).run().promise()
}

export const getFindAllModelName : Fn1<string, string> = pipe(capitalize, concat('findAll'))
export const findAll = queryAll('findAll')
export const getAllModelMetaName : Fn1<string, string> = pipe(capitalize, surround('_all', 'Meta'))
export const meta = queryAll('meta')

const fetchNTo1Relationships = (mRelationship, input) => taskOf(mRelationship)
.map(filter(both(path(['from', 'as']), path(['from', 'multi']))))
.map(filter(pipe(path(['from', 'as']), prop(__, input))))

const fetch1ToNRelationships = (mRelationship, input) => taskOf(mRelationship)
.map(filter(both(path(['from', 'as']), path(['to', 'multi']))))
.map(filter(pipe(path(['from', 'as']), prop(__, input))))

const fetch1ToNIdsRelationships = (mRelationship, input) => taskOf(mRelationship)
.map(filter(both(path(['from', 'as']), path(['to', 'multi']))))
.map(filter(pipe(path(['from', 'as']), concat(__, 'Ids'), prop(__, input))))

const _updateSubModelT = getService => (modelName, fields, where) => {
	const getModelConnector = getService({name: getModelConnectorNameByModelName(modelName)})
	return promiseToTask(getModelConnector())
	.chain(x => x.updateT(fields, {where}))
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
	
	const createSubModelT = (modelName, fields) => {
		const service = getService({name: getCreateModelName(modelName)})
		return promiseToTask(service({input: fields}))
	}
	
	const updateSubModelT = _updateSubModelT(getService)
	
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
	const {id, ...fields} = input
	
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
	const updateModel = x => modelConnector.updateT(x, {where: {id}})
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
	
	const updateSubModelT = _updateSubModelT(getService)
	// ids
	// id -> Task void
	const update1ToNIds = () => fetch1ToNIdsRelationships(modelRelationships, input)
	.chain(relationships => List(relationships)
		.traverse(taskOf, ({from, to}) =>{
			const ids = prop(`${from.as}Ids`, input)
			return (isEmpty(ids)
				? taskOf()
				: delModelT(to.model, {
					[to.foreignKey]: id,
					id: {$notIn: ids}
				}))
			.chain(() => updateSubModelT(
				to.model,
				{[to.foreignKey]: id},
				{id: {$in: ids}}
			))
		})
	)
	
	return taskDo(function * () {
		const ids = yield updateNTo1s
		const ret = yield updateModel({...fields, ...ids})
		yield List.of(update1ToNs, update1ToNIds)
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
	const modelConnector = await getModelConnector()
	return modelConnector.destroy({where: {id}})
}

export const getFindOneModelName : Fn1<string, string> = pipe(capitalize, concat('findOne'))
export const findOne = ({model}) => async (
	{
		[getModelConnectorName(model)]: getModelConnector
	},
	args = {}

) => {
	const names = Box(model.fields)
	.map(filter(prop('isUnique')))
	.map(map(prop('name')))
	.fold(reject(pipe(prop(__, args), isNil)))
	
	if (names.length !== 1 && (keys(omit([OPTIONS_KEY], args))).length !== 1) {
		return Promise.reject(`One and Only one id or isUnique field is allowed`)
	}
	
	const modelConnector = await getModelConnector()
	return modelConnector.findOne({where: pick(names, args)})
}

export const getUpsertModelName : Fn1<string, string> = pipe(capitalize, concat('upsert'))
export const upsert = ({model}) => async (
	{
		[getUpdateModelName(model.name)]: update,
		[getCreateModelName(model.name)]: create,
	},
	args = {}

) => {
	const {input: {id}} = args
 	if (id) return update(args)
	return create(args)
}

export const createRelationResolvers = ({relationships, models, core}) => {
	return Box(models)
	.map(map( model => {
		const modelRelationships = getModelRelationships(relationships, model.name)
		return ({
				[model.name]: Box(model.fields)
					.map(filter(propEq('fieldKind', 'relation')))
					.map(map( x=> {
						const modelRelationship = modelRelationships.find(pathEq(['from', 'as'], x.name))
						const {from: {foreignKey}, to: {model: toModelName}} = modelRelationship
						const getNTo1Field = (obj, args, context) => obj[foreignKey]
              ? core.getService(`${getFindOneModelName(toModelName)}`)(
                  {
                    ...pick([OPTIONS_KEY], context || {} ),
                    id: obj[foreignKey]
                  }
                )
              : null
						const get1ToNField = (obj, args, context) => core.getService(`${getFindAllModelName(toModelName)}`)(
							{
                ...pick([OPTIONS_KEY], context || {} ),
                ...over(
									lensProp('filter'),
									merge({[foreignKey]: obj.id}),
									args
								)
							}
						)
						
						return {
							[x.name]: x.isList ? get1ToNField : getNTo1Field
						}
					}))
					.fold(reduce(merge, {}))
			})
		}
	))
	.fold(reduce(merge, {}))
}
