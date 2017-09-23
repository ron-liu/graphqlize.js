import Sequelize from 'sequelize'
import {converge, pipe, head, toUpper, tail, concat, join, curry} from './functions'
import {toLower} from "ramda";
import type {CurriedFn3} from "../basic-types";

export const printJson = x => console.log(JSON.stringify(x, null, '\t'))

export const SequelizeJsonType = {
	type: Sequelize.JSON,
	get: function(name) {
		const v = this.getDataValue(name)
		if (typeof v === 'string') {
			try {
				return JSON.parse(v)
			}
			catch (e) {
				return v
			}
		} else {
			return v
		}
	}
}

export const capitalize: (word: string) => string = converge(
	concat, [
		pipe(head, toUpper),
		tail
	]
)

export const deCapitalize = converge(concat, [ pipe(head, toLower), tail ])

export const joinGraphqlItems = join(', ')

export const surround:CurriedFn3<string, string, string, string>
= curry((xs, before, after) => `${before}${xs}${after}`)
