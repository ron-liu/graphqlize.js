import {getModels} from '../model'
import {getAst} from '../ast'
import {genModelsInputs, schemaToString} from '../schema'
import {List, taskOf, tap, map} from '../util'

describe ('types to inputs', () => {
	const types = [
		[`type Person { id: ID name: String }`],
		[
			`type Person {
			id:ID
			name:String
			histories: [History!] @relation(name: "PersonHistories")
			latestHistory: History @relation(name: "PersonHistory")
		}`,
			`type History { id:ID name:String }`,
		],
		[
			`type Person {
			id:ID
			name:String
			v_histories: [History!]
			v_latestHistory: History
		}`,
			`type History @valueObject { id:ID name:String }`,
		],
	
	]
	
	test('inputs should ok', async () => {
		await List(types)
		.map(types => ({schema: {types}, customScalar: []}))
		.traverse(taskOf, option => getAst(option)
			.chain(x=>getModels(x, option))
			.map(genModelsInputs)
		)
		.map(x=>x.toArray())
		.map(map(tap(console.log)))
		.map(inputs => expect(inputs).toMatchSnapshot())
		.run().promise()
	})
})

describe('schema to string', () => {
	const schemas = [
		{
			types: [
				`type Post {name: String}`
			],
			queries: [
				`posts(id:ID, name:String):[Post]`,
				`post(id:ID):Post`
			],
			mutations: [
				`createPost(name:String):Post`,
				`updatePost(id:ID, name:String):Post`
			]
		},
		{
			types: [
				`type Post {name: String}`
			],
			queries: [
				`posts(id:ID, name:String):[Post]`,
				`post(id:ID):Post`
			],
			
		},
		{
			types: [
				`type Post {name: String}`
			],
			mutations: [
				`createPost(name:String):Post`,
				`updatePost(id:ID, name:String):Post`
			]
			
		},
		{
			types: [
				`type Post {name: String}`
			]
		}
	]
	test('should ok', async () => {
		await List(schemas)
		.traverse(taskOf,  schema => schemaToString(schema))
		.map(x => x.toArray())
		.map(map(tap(console.log)))
		.map(s => expect(s).toMatchSnapshot())
		.run().promise()
		
	})
})
