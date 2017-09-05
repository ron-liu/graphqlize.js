export {
	not, converge, filter, applySpec, evolve, lensProp, over, toPairs, fromPairs, lensIndex,
	contains, join, when, prop, equals, find, tap, map, path, range, inc, dec,
	pick, mergeAll, omit, mapObjIndexed, or, assoc, props, isNil, type, pathEq, length, drop, forEach, groupWith,
	propEq, pair, values, flatten, merge, flip, useWith, ifElse, reject, init, take, skip, subtract,
	head, toUpper, tail, of, toLower, pipe, curry, objOf, __, propOr, has, uniq, groupBy, either, is, all,
	and, set, lensPath, reduce, view, last, apply, keys, call, curryN, mergeWith, remove, split, both, F, toString,
	gt, lt, gte, lte, zipObj, forEachObjIndexed, pathSatisfies, add, propSatisfies, pickBy, multiply, any, compose, isEmpty
} from 'ramda'

export {
	identity as I,
	constant as K
} from 'folktale/core/lambda'
export {concat} from 'folktale/fantasy-land'

export const isArray = Array.isArray

export const Box = x =>
({
	map: f => Box(f(x)),
	fold: f => f(x),
	inspect: () => `Box(${x})`
})

export const printJson = x => console.log(JSON.stringify(x, null, '\t'))

export const SequelizeJsonType = {
	type: Sequelize.JSON,
	get: function(name) {
		const v = this.getDataValue(name)
		if (typeof v === 'string') {
			try {
				return JSON.parse(v)
			}
			catch (e) {
				return v
			}
		} else {
			return v
		}
	}
}
