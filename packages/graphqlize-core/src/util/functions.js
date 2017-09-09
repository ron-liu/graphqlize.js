import {curry, prop, pipe, isNil, not, equals} from 'ramda'
export {
	not, converge, filter, applySpec, evolve, lensProp, over, toPairs, fromPairs, lensIndex,
	contains, join, when, prop, equals, find, tap, map, path, range, inc, dec,
	pick, mergeAll, omit, mapObjIndexed, or, assoc, props, isNil, type, pathEq, length, drop, forEach, groupWith,
	propEq, pair, values, flatten, merge, flip, useWith, ifElse, reject, init, take, skip, subtract,
	head, toUpper, tail, of, toLower, pipe, curry, objOf, __, propOr, has, uniq, groupBy, either, is, all,
	and, set, lensPath, reduce, view, last, apply, keys, call, curryN, mergeWith, remove, split, both, F, toString,
	gt, lt, gte, lte, zipObj, forEachObjIndexed, pathSatisfies, add, propSatisfies, pickBy, multiply, any, compose, isEmpty, concat,
	identity as I,
	always as K
} from 'ramda'

export const isArray = Array.isArray

export const propFn = curry((name, fn, obj) => fn(prop(name, obj)))
export const isNotNil = pipe(isNil, not)
export const notEquals = curry( (a, b) => pipe(equals(a), not)(b) )
