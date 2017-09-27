import Sequelize from 'sequelize'
import {getAst} from '../ast'
import {getModels} from '../model'
import {
	task, taskTry, K, promiseToTask, taskDo, taskifyPromiseFn, taskOf, Map, List,
	last, range, tap, length
} from "../util";
import {createCore} from "injectable-core";
import {graphqlizeT} from "../index";
import initData from '../init-data'
import glob from 'glob'

export const createSequelize = () => new Sequelize('', '', '', { dialect: 'sqlite',})
export const getModelsFromTypes = types => taskOf(types)
	.map(x=>({schema: {types, customerScalars: []}}))
	.chain(getAst)
	.chain(x=>getModels(x, {schema: {types, customerScalars: []}}))
	.run()
	.promise()



export const getFilesT = pattern => task(({resolve, reject}) => glob(pattern, {}, (err, files) => {
	if (err) reject(err)
	resolve(files)
}))

export const getFiles = pattern => glob.sync(pattern, {})
