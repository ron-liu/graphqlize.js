import type {Fn1} from './basic-types'
import type {Schema, Ast} from './types'
import {when, pipe, path, isArrayLike, join} from './util'
import {parse} from 'graphql'
import Result from 'folktale/result'

// Schema -> Result Ast
export const schemaToAst: Fn1<Schema, Ast> = pipe(
	path([ 'types' ]),
	when(isArrayLike, join('\n')),
	x => Result.try(() => parse(x, {noLocation: true}))
)