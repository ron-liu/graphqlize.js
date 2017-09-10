// @flow

import type {Fn4, Fn1} from './basic-types'
import Sequelize from 'sequelize'

export type Schema = {
	types: Array<string>,
	queries?: Array<string>,
	mutations?: Array<string>,
	inputs?: Array<string>
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
	core: Core
}
type ExecutableSchema = mixed // Task<executableSchema>
export type Graphqlize = Fn1<GraphqlizeOption,ExecutableSchema>

export type Ast = mixed
export type Relationship = {
	from: {
		multi: boolean,
		model: string,
		as: string
	},
	to: {
		multi: boolean,
		model: string,
		as?: string
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
	interfaces: [string],
	directives: [Directive],
	fields: [Field],
	modelKind: 'valueObject' | 'persistence' | 'outSourcing'
}