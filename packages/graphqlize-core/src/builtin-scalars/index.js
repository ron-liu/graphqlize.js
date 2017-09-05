import type {CurriedFn2} from "../basic-types";

export * from './date.js'
export * from './dateTime.js'
export * from './decimal.js'
export * from './json.js'
export * from './lnglat'
import {DateScalarType} from './date'
import {DateTimeScalarType} from './dateTime'
import {DecimalScalarType} from './decimal'
import {JsonScalarType} from './json'
import {LngLatScalarType} from './lnglat'
import Sequelize from 'sequelize'
import {SequelizeJsonType, merge, lensProp, over} from '../util'
import type {CustomScalars, GraphqlizeOption} from '../types'
import type {Fn1} from '../basic-types'

const builtInScalars: CustomScalars = {
	'Date': {
		sequelizeType: {
			type: Sequelize.DATE,
			get: function(name)  {
				const v = this.getDataValue(name)
				return v == null ? null : new Date(v);
			},
		},
		resolver: DateScalarType
	},
	'DateTime': {
		sequelizeType: Sequelize.DATE,
		resolver: DateTimeScalarType
	},
	'Json': {
		sequelizeType: SequelizeJsonType,
		resolver: JsonScalarType
	},
	'Decimal': {
		sequelizeType: Sequelize.DECIMAL,
		resolver: DecimalScalarType
	},
	'LngLat': {
		sequelizeType: {
			type: Sequelize.JSON,
			get: function(name) {
				const v = this.getDataValue(name)
				if (typeof v === 'string') {
					try {
						return JSON.parse(v)
					}
					catch (e) {
						return undefined
					}
				} else {
					return v
				}
			}
		},
		resolver: LngLatScalarType
	}
}

const mergeOptionWithScalars : Fn1<CustomScalars, Fn1<GraphqlizeOption, GraphqlizeOption>>
= scalars => over(lensProp('customScalars'), merge(scalars))

export const mergeOptionWithBuiltInScalars = mergeOptionWithScalars(builtInScalars)
