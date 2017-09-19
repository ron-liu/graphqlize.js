import type {Fn1} from './basic-types'
import type {Schema, Ast, GraphqlizeOption} from './types'
import {when, pipe, prop, isArray, join, path, taskTry} from './util'
import {parse} from 'graphql'

// GraphqlizeOption -> Task Ast
export const getAst = pipe(
	path(['schema','types']),
	when(isArray, join('\n')),
	x => taskTry(() => parse(x, {noLocation: true}))
)