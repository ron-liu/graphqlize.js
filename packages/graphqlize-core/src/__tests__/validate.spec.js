import validate from '../validate'

test('invalid option should return Failure', () => {
	validate({}).fold(
		x => expect(x).toEqual(expect.arrayContaining([
			"schema.types is required",
			"connection.option.dialect is required"
		])),
		()=>{}
	)
})

test('valid option should return option', () => {
	const option = {
		schema: {types: "type user {id ID}"},
		connection: {option: {dialect: 'mysql'}}
	}
	
	validate(option).fold(
		()=>{},
		x=>expect(x).toEqual(option)
	)
})