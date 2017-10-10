import {v4} from 'uuid'
const id1 = v4()

export default {
	types: [`
		type User {
			id: ID,
			name: String @isUnique,
			age: Int
		}
	`],
	cases: [
		{
			name: 'query',
			init: {
				User: [
					{id: id1, content: 'hi', likes: 2},
				]
			},
			acts: [
				['findOneUser', {id: id1}, {toEqual: expect.anything()}],
				['findOneUser', {}, {'rejects.toMatch': 'One and Only one'}],
				// ['findOneUser', {contain: 'hi'}, {toEqual: expect.anything()}],
			]
		}
	]
}