import Sequelize from 'sequelize'
import {taskOf} from '../util'
import {getAst} from '../ast'
import {getModels} from '../model'


export const createSequelize = () => new Sequelize('', '', '', { dialect: 'sqlite',})
export const getModelsFromTypes = types => taskOf(types)
	.map(x=>({schema: {types, customerScalars: []}}))
	.chain(getAst)
	.chain(x=>getModels(x, {schema: {types, customerScalars: []}}))
	.run()
	.promise()
