import {getOption} from '../option'
import {taskOf} from '../util'

test('invalid option should return Failure', async () => {
	await getOption({})
	.chain(x=>{throw 'should not be here'})
	.orElse(
		x => {
			expect(x).toEqual(expect.arrayContaining([
				"schema.types is required",
				"connection.option.dialect is required",
				"core is required"
			]))
			return taskOf({})
		}
	)
	.run()
	.promise()
})

test('valid option should return option', async () => {
	const option = {
		schema: {types: ["type user {id ID}"]},
		connection: {option: {dialect: 'mysql'}},
		core: {}
	}
	
	const validatedOption = await getOption(option)
	.run()
	.promise()
	
	expect(validatedOption).not.toBeNull()
	
})

test('rectify should auto patch', async () => {
	const option = {
		schema: {types: ["type user {id ID}"]},
		connection: {option: {dialect: 'mysql'}},
		core: {}
	}
	
	const validatedOption = await getOption(option)
	.run()
	.promise()
	
	expect(validatedOption).toEqual(expect.objectContaining({
		resolvers: {},
		handlers: {},
		connectorMiddlewares: []
	}))
})

test('rectify should not touch filled props', async () => {
	const option = {
		schema: {types: ["type user {id ID}"]},
		connection: {option: {dialect: 'mysql'}},
		core: {},
		resolvers: {a:1},
		handlers: {b:2},
		connectorMiddlewares: ['abc']
	}
	
	const validatedOption = await getOption(option)
	.run()
	.promise()
	
	expect(validatedOption).toEqual(expect.objectContaining({
		resolvers: {a:1},
		handlers: {b:2},
		connectorMiddlewares: ['abc']
	}))
})