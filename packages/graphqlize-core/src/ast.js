import type {Fn1} from './basic-types'
import type {Schema, Ast, GraphqlizeOption} from './types'
import {when, pipe, prop, isArray, join, path, taskTry} from './util'
import {parse} from 'graphql'

// Schema -> Task Ast
export const getAst: Fn1<GraphqlizeOption, Ast> = pipe(
	path(['schema','types']),
	when(isArray, join('\n')),
	x => taskTry(() => parse(x, {noLocation: true}))
)