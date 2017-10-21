import {graphqlizeT} from 'graphqlize-core'
import {createCore} from 'injectable-core'
import glob from 'glob'
import {Fn1} from './basic-types'
import {of, task} from 'folktale/concurrency/task'
import {readFile as _readFile} from 'fs'
import {prop, pipe, applySpec, identity, always, tap} from 'ramda'
import {List} from 'immutable-ext'
import {promiseToTask} from './util'
import {makeExecutableSchema} from "graphql-tools";

type Pattern = {
	pattern: string,
	ignores: Array<string>
}

export const loadFiles : Fn1<Pattern, Array<string>>
= ({pattern, ignores = [ '**/node_modules/**' ]}) =>
	task(({resolve, reject}) => glob(pattern, {ignore: ignores}, (err, files) => {
		if (err) {reject(err)}
		else {resolve(files)}
	}))

const readFile
= path => task(({reject, resolve}) => _readFile(path, 'utf8', (err, content) => {
	if (err) {return reject(err)}
	resolve(content)
}))

const readFiles
= pattern => of({pattern})
.chain(loadFiles)
.chain(files=>List(files).traverse(of, readFile))
.map(x=>x.toArray())

export const setupGraphqlize
= option => {
	const {serviceFilePattern, schemaFilePattern, connection, core = createCore()} = option

	return promiseToTask(core.batchAddServices(serviceFilePattern))
	.chain(() => readFiles(schemaFilePattern))
	.map(applySpec({
		schema: applySpec({types: identity}),
		connection: always(connection),
		core: always(core)
	}))
	.chain(graphqlizeT)
	.run()
	.promise()
}
