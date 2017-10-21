import {prop, head} from 'ramda'

export default {
	types: [`
		type Post {
			id: ID
			json: Json
			lngLat: LngLat
			decimal: Decimal
			dateTime: DateTime
			date: Date
		}
	`],
	
	cases: [
		{
			only: true,
			name: 'json should work',
			init: {
				Post: [
					{
						json: {a: 1},
						lngLat: {lng: 0.12, lat: 122},
						decimal: 1.2,
						dateTime: new Date,
						date: new Date
					},
				]
			},
			gqlActs: [
				[
					['{allPosts {json, lngLat, decimal, dateTime, date}}'], {},
					prop('allPosts'), {toHaveLength: 1},
					head, {
					toEqual: expect.objectContaining({
						json: {a: 1},
						lngLat: {lng: 0.12, lat: 122},
						decimal: 1.2,
						dateTime: new Date,
						date: new Date
					})
				}
				]
			]
		}
	]
}
