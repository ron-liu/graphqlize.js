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
	port: number,
	schemaFilePattern: string,
	serviceFilePattern: string,
	connection: Connection
}