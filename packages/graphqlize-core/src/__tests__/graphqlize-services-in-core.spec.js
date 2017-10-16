import graphqlize from '..'
import {createCore, injectable} from 'injectable-core'
import {graphql} from 'graphql'
let executableSchema
beforeAll(async (done) => {
	const add3 = injectable({
		graphql: {
			kind: 'mutation',
			input: {a: 'Int'},
			payload: {result: 'Int'}
		}
	})(({}, {a}) => ({result: a + 3}))
	const core = createCore()
	core.addService('add3', add3)
	
	const option = {
		schema: {
			types: [`type Post {id: ID}`]
		},
		connection: {
			option: {
				dialect: 'sqlite'
			}
		},
		core
	}
	
	executableSchema = await graphqlize(option)
	done()
})

it('add3 should work', async () => {
	const ret = await graphql(executableSchema, `mutation add3($input:Add3Input){add3(input:$input){result}}`, null, null, {input: {a: 2}})
	expect(ret).toEqual({data: {add3: {result: 5}}})
})