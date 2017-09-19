import {getModels} from '../model'
import {getAst} from '../ast'
import {genModelsInputs} from '../schema'

test('simple models inputs should ok', async () => {
	const types = [`
	type Person {
		id: ID
		name: String
	}
	`]
	const option = {schema: {types}, customScalar: []}
	const inputs = await getAst(option)
		.chain(x=>getModels(x, option))
		.map(genModelsInputs)
		.run()
		.promise()
	
	console.log(inputs)
	expect(inputs).toMatchSnapshot() // run: npm test -- -u, if code changed
})