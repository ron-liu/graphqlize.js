import { GraphQLScalarType } from 'graphql'

export const DateScalarType = new GraphQLScalarType({
	name: 'Date',
	description: 'Date custom scalar type',
	parseValue(value) {
		const date = new Date(value)
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

