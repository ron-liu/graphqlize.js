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
					{id: id1, name: 'ron', likes: 2},
				]
			},
			acts: [
				['findOneUser', {id: id1}, {toEqual: expect.anything()}],
				['findOneUser', {}, {'rejects.toMatch': 'One and Only one'}],
				['findOneUser', {name: 'ron'}, {toEqual: expect.anything()}],
				['findOneUser', {name: 'ang'}, {'rejects.toMatch': 'One and Only one'}],
				['findOneUser', {name: 'ron', id: id1}, {'rejects.toBeDefined': 'One and Only one'}],
			]
		}
	]
}