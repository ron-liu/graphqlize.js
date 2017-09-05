import { GraphQLScalarType } from 'graphql'

export const DateTimeScalarType = new GraphQLScalarType({
	name: 'DateTime',
	description: 'DateTime custom scalar type',
	parseValue(value) {
		return new Date(value); // value from the client
	},
	serialize(value) {
		return new Date(value); // value sent to the client
	},
	parseLiteral(ast) {
		if (ast.kind === Kind.STRING) {
			return new Date(ast.value); // ast value is always in string format
		}
		return null;
	},
})
