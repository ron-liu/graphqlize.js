// @flow

import {injectable} from 'injectable-core'
import {
	isArray, K, List, Map, any, ifElse, pathEq, pipe, prop, reject, toPairs, path, reduce,
	merge, flatten, Box, promiseToTask, taskDo, taskifyPromiseFn, taskOf, map, filter,
	endsWith
} from "./util";
import {getCreateModelName, getUpdateModelName} from "./resolve";
import DataLoader from 'dataloader'
import {getModelConnectorName, getModelConnectorNameByModelName} from "./connector";
import {getModelRelationships} from "./relationship";
import {isEmpty, tap} from "ramda";

type Data = {[id: string]: [mixed]}

// Data -> Task void
export default injectable({
	injects: ['getService', '$getAllModelsInfo', '$getDb']
})((
	{ getService, $getAllModelsInfo, $getDb },
	data: Data
) => {
	const {relationships, models} = $getAllModelsInfo()
	const db = $getDb()
	
	// x -> boolean
	const  isFunction = ifElse(
		isArray,
		any(x => typeof x === 'function'),
		x => typeof x === 'function'
	)
	const serviceLoader = new DataLoader(([name]) => Promise.resolve([getService({name})]), {batch: false})
	const connectorLoader = new DataLoader(([modelName]) => {
		return serviceLoader.load(getModelConnectorNameByModelName(modelName))
			.then(getModelConnector => [getModelConnector()])
	}, {batch: false})
	
	const createModelT = modelName => fields => {
		return promiseToTask(serviceLoader.load(getCreateModelName(modelName))
			.then(service => service({input: fields})))
	}

	const updateModelT = modelName => fields => {
		
		return promiseToTask(
			serviceLoader.load(getUpdateModelName(modelName))
			.then(service => service({input: fields}))
		)
	}
	
	const createModel = ({modelName, fields}) => taskDo(function * () {
		const modelRelationships = getModelRelationships(relationships, modelName)
		const model = yield taskOf(fields)
		.map(reject(isFunction))
		.chain(createModelT(modelName))
		
		return taskOf(() => Box(fields)
		.map(toPairs)
		.map(filter(pipe(path([1]), isFunction )))
		.fold(List)
		.traverse(taskOf,
			([name, value]) => {
				const relationship = endsWith('Ids', name)
					? modelRelationships.find(pathEq(['from', 'as'], name.replace('Ids', '')))
					: modelRelationships.find(pathEq(['from', 'as'], name))
				const getConnectorP = () => connectorLoader.load(relationship.to.model)
				const resolveValue = pipe(
					ifElse(
						x => typeof x === 'function',
						ifElse(
							K(relationship),
							f => {
								const ret = getConnectorP().then(connector => f(connector))
								return promiseToTask(ret)
							},
							pipe(f => f(), Promise.resolve, promiseToTask)
						),
						taskOf
					)
				)
				return resolveValue(value).map(x => ({[name]: x}))
			}
		)
		.map(reduce(merge, {id:model.id}))
		.chain(ifElse(isEmpty, taskOf, updateModelT(modelName))))
	})
	return promiseToTask(db.sync({force: true}))
	.chain(() => taskOf(data))
	.map(toPairs)
	.map(map(([modelName, objs]) => objs.map(o => ({modelName, fields: o}))))
	.map(flatten)
	.chain(m => List(m).traverse(taskOf, createModel))
	.chain(xs => xs.traverse(taskOf, x => x()))
	.run().promise()
})
