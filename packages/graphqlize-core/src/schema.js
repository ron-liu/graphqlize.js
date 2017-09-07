import type {GraphqlizeOption, Schema} from './types'
import type {Fn1} from 'basic-types'
import {mergeWith, over, concat, lensProp} from "./util";

const systemSchema : Schema = {
	types: [
		`enum OrderDirectionEnum { Asc Desc }`,
		`type _QueryMeta @noTable {count: Int!}`,
		`type File @noTable {
			id: ID!
			name: String!
			createdAt: DateTime
			updatedAt: DateTime
			size: Int!
			url: String!
			key: String!
		}`
	]
}

export const mergeSystemSchema : Fn1<GraphqlizeOption, GraphqlizeOption> =
	over(lensProp('schema'), mergeWith(concat, systemSchema))