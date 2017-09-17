import Sequelize from 'sequelize'
import {converge, pipe, head, toUpper, tail, concat} from './functions'

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
