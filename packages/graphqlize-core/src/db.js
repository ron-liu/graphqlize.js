import Sequelize from 'sequelize'
import { GraphqlizeOption, Connection, Db} from './types'
import {
	Box, pipe, props, K, curry, prop, isNil, promiseToTask, Task, map, ifElse, tap, path, taskOf, taskTry,
	applySpec, converge, pair, fromPairs, forEach, propSatisfies, isNotNil, filter
} from './util'
import {CurriedFn2, Fn1} from './basic-types'

// GraphqlizeOption -> Task error db
export const initSequelize = option => taskTry(
	() => Box(option)
		.map(prop('connection'))
		.map(props([ 'database', 'username', 'password', 'option' ]))
		.fold(x => new Sequelize(...x))
)

// GraphqlizeOption -> db -> Task
export const registerGetDbService = (option, db) => taskTry(
	() => Box(option)
		.map(prop('core'))
		.fold(core => core.buildAndAddService({
			name: 'getDb',
			func: ({}, _) => db
		}))
)

// GraphqlizeOption -> Db -> Task
export const sync = (option, db) => pipe(
	ifElse(
		pipe(path(['connection', 'option', 'sync']), isNil),
		taskOf,
		pipe(path(['connection', 'option', 'sync']), x => db.sync(x), promiseToTask)
	),
	map(K(true))
)(option)

// [Field] -> {[id:string]: SequelizeFieldDefinition}
const getSequelizeModelDefinitions = pipe(
	prop('fields'),
	filter(propSatisfies(isNotNil, 'sequelizeType')),
	map(converge(pair, [
		prop('name'),
		applySpec({
			type: prop('sequelizeType'),
			allowNull: ifElse(prop('isList'), prop('allowNullList'), prop('allowNull')),
			primaryKey: prop('primaryKey'),
			unique: prop('isUnique')
		})
	])),
	fromPairs
)

export const defineSequelizeModels = (db, models) => taskTry(
	() => {
		models.forEach(
			converge((modelName, definitions) => db.define(modelName, definitions),
				[
					prop('name'),
					getSequelizeModelDefinitions
				]
			)
		)
	}
)

export const defineSequelizeRelations = (db, relationships) => taskTry(
	() => {
		relationships.forEach(
			({
				from:{multi: fromMulti, as: fromAs, model: fromModelName, foreignKey: fromForeignKey},
				to: {to: toMulti, as: toAs, model: toModelName, foreignKey: toForeignKey}
			}) => {
				const FromModel = db.model(fromModelName)
				const ToModel = db.model(toModelName)
				
				// n-n, must be bi-direction
				if (fromMulti && toMulti) {
					FromModel.belongsToMany(ToModel, {as: fromAs, through: `${fromModelName}${toModelName}_${fromAs}`})
					ToModel.belongsToMany(FromModel, {as: toAs, through: `${fromModelName}${toModelName}_${fromAs}`})
					return
				}
				
				// n-1 or 1-1
				if (!toMulti) {
					FromModel.belongsTo(ToModel, {as: fromAs, foreignKey: fromForeignKey})
					toAs && ToModel[fromMulti ? 'hasMany' : 'hasOne'](FromModel, {as: toAs})
					return
				}
				
				// 1-n
				FromModel.hasMany(ToModel, {as: fromAs, foreignKey: fromForeignKey})
				toAs && ToModel.belongsTo(FromModel, {as: toAs, foreignKey: toForeignKey})
			}
		)
	}
)
