import {getModels} from '../model'
import {getAst} from '../ast'
import {genModelsInputs} from '../schema'
import {taskOf, tap} from '../util'
import {List} from 'immutable-ext'

const schemas = [
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
			histories: [History!]
			latestHistory: History
		}`,
		`type History @valueObject { id:ID name:String }`,
	],
	
]

test('inputs should ok', async () => {
	await List(schemas)
		.map(types => ({schema: {types}, customScalar: []}))
		.traverse(taskOf, option => getAst(option)
			.chain(x=>getModels(x, option))
			.map(genModelsInputs)
			.map(tap(console.log))
			.map(inputs => expect(inputs).toMatchSnapshot())
		).run().promise()
	
})