/*
* Inspired from https://github.com/taion/graphql-type-json/blob/master/src/index.js
* */

import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

function identity(value) {
	return value;
}

function parseLiteral(ast) {
	console.log(333111, value)
	
	switch (ast.kind) {
		case Kind.STRING:
		case Kind.BOOLEAN:
			return ast.value;
		case Kind.INT:
		case Kind.FLOAT:
			return parseFloat(ast.value);
		case Kind.OBJECT: {
			const value = Object.create(null);
			ast.fields.forEach((field) => {
				value[field.name.value] = parseLiteral(field.value);
			});
			
			return value;
		}
		case Kind.LIST:
			return ast.values.map(parseLiteral);
		default:
			return null;
	}
}

export const JsonScalarType = new GraphQLScalarType({
	name: 'Json',
	description:
	'The `JSON` scalar type represents JSON values as specified by ' +
	'[ECMA-404](http://www.ecma-international.org/' +
	'publications/files/ECMA-ST/ECMA-404.pdf).',
	serialize: function(value) {
		console.log(111111, value)
		if (typeof value === 'string') return JSON.parse(value)
		return value
	},
	parseValue: function (value) {
		console.log(222111, value)
		if (typeof value === 'string') return JSON.parse(value)
		return value
	},
	parseLiteral,
});