import { GraphQLScalarType } from 'graphql'

export const DecimalScalarType = new GraphQLScalarType({
	name: 'Decimal',
	description: 'Decimal custom scalar type',
	parseValue(value) {
		return parseFloat(parseFloat(value).toFixed(2))
	},
	serialize(value) {
		return parseFloat(value)
	},
	parseLiteral(ast) {
		if (ast.kind === Kind.STRING) {
			return parseFloat(ast.value); // ast value is always in string format
		}
		return null;
	},
})
