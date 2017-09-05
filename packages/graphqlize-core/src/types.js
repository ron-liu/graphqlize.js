import type {Fn4, Fn1} from './basic-types'

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
export type GraphqlizeOption = {
	schema: Schema,
	connection: Connection,
	customerScalars?: CustomScalars,
	resolvers?: WholeResolvers,
	handlers?: Handlers
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