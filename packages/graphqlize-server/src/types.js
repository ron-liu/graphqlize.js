// @flow
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

export type GraphqlServerExpressOption = {
	port?: number,
  schema?: string | [string],
	schemaFilePattern?: string,
	serviceFilePattern: string,
	graphqlPath?: string,
	graphiqlPath?: string,
	connection: Connection,
	app?: mixed,
  middlewares: [Function],
	core?: mixed
}