import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

export const LngLatScalarType = new GraphQLScalarType({
	name: 'LngLat',
	description:
	'{latitude, longitude}',
	serialize: function(value) {
		if (typeof value === 'string') return JSON.parse(value)
		return value
	},
	parseValue: function (value) {
		if (typeof value === 'string') return JSON.parse(value)
		return value
	},
	parseLiteral(ast) {
		if (ast.kind === Kind.STRING) {
			return JSON.parse(ast.value); // ast value is always in string format
		}
		return null;
	} ,
});