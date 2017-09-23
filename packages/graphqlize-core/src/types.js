// @flow

import type {Fn4, Fn1} from './basic-types'
import Sequelize from 'sequelize'

export type Schema = {
	types: Array<string>,
	queries?: Array<string>,
	mutations?: Array<string>
}

type Connection = {
	database?: string,
	username?: string,
	password?: string,
	option: {
		host?: string,
		port?: number,
		dialect: 'mysql' | 'sqlite' | 'postgres' | 'mssql',
		storage?: string,
		sync?: {force: boolean},
	},
}

type CustomScalar = {
	sequelizeType: mixed,
	resolver?: mixed
}

export type CustomScalars = {[id: string]: CustomScalar}

type Obj = mixed
type Args = mixed
type Context = mixed
type Info = mixed
type Result = mixed
type Resolver = Fn4<Obj, Args, Context, Info, Result>
type Resolvers = {[id: string]: Resolver}
type WholeResolvers = {
	Query?: Resolvers,
	Mutation?: Resolvers
}

type Handler = Fn1<mixed, void>
type Handlers = {[id: string]: Handler}
type Core = mixed
export type GraphqlizeOption = {
	schema: Schema,
	connection: Connection,
	customerScalars?: CustomScalars,
	resolvers?: WholeResolvers,
	handlers?: Handlers,
	core: Core,
	connectorMiddlewares?: [string]
}
type ExecutableSchema = mixed // Task<executableSchema>
export type Graphqlize = Fn1<GraphqlizeOption, ExecutableSchema>

export type Ast = mixed
export type Relationship = {
	from: {
		multi: boolean,
		model: string,
		as: string,
		foreignKey: string,
	},
	to: {
		multi: boolean,
		model: string,
		as?: string,
		foreignKey: string,
	}
}
export type Db = typeof Sequelize

export type Connector = mixed

export type SequelizeType = mixed

export type Field = {
	name: string,
	isList: boolean,
	allowNullList: boolean,
	primaryKey: boolean,
	allowNull: boolean,
	isSystemField: boolean,
	isUnique: boolean,
	graphqlType: string,
	sequelizeType: SequelizeType,
	fieldKind: 'scalar' | 'enum' | 'valueObject' | 'relation'
}

type Argument = {
	name: string,
	value: string
}

export type Directive = {
	name: string,
	arguments: [Argument]
}

export type Model = {
	name: string,
	interfaces: [string],
	directives: [Directive],
	fields: [Field],
	modelKind: 'valueObject' | 'persistence' | 'outSourcing'
}

export type Action = 'create' | 'update' | 'upsert' | 'delete'

export type GenModelInputOption = {
	allowIdNull: boolean,
	allowFieldsOtherThanIdNull: boolean,
	action: string
}

export type WhereAndInclude = {where: mixed, include: [mixed]}

export type ExposeToGraphqlOption = { // customised query or mutation
	kind: 'query' | 'mutation',
	input?: {[id: string]: string | [string]},
	payload: {[id: string]: string | [string]}
} | { // built-in model CRUD
	kind: 'query' | 'mutation',
	args?: {[id: string]: string},
	returns: string | [string]
}
