// @flow

import type {GraphqlServerExpressOption} from './types'
import express from 'express'
import {graphiqlExpress, graphqlExpress } from 'graphql-server-express'
import perRequestPlugin, {PER_REQUEST_KEY_NAME} from 'injectable-plugin-perrequest'
import {setupGraphqlize} from './setup-graphqlize'
import {tap, when} from "ramda";
import bodyParser from 'body-parser'
import cors from 'cors'
import {createCore, OPTIONS_KEY} from 'injectable-core'
import {initData} from "graphqlize-core";

export const getServer: GraphqlServerExpressOption => Express
= option => {
	const {
		graphqlPath = '/graphql', graphiqlPath = '/graphiql', app = express(), middlewares = []
	} = option
	app.use([
		bodyParser.urlencoded({ extended: true }),
		bodyParser.json({limit: '50mb'}),
		cors(),
    ...middlewares
	])
	
	return setupGraphqlize(option)
	.then(schema => app.use(graphqlPath, graphqlExpress(req => ({
		schema,
		context: {[OPTIONS_KEY]: {[PER_REQUEST_KEY_NAME]: req}},
	}))))
	.then(when(
		() => 'production' !== process.env.NODE_ENV,
		() => app.use(graphiqlPath, graphiqlExpress({endpointURL: graphqlPath, query: '{}'}))
	))
	.then(() => app)
}

export const startServer: GraphqlServerExpressOption => void
= option => getServer(option)
	.then(app => app.listen(option.port || 3000))

export const setupInitData = async (option, data) => {
	const core = createCore()
	core.addService('initData', initData)
	
	const executableSchema = await setupGraphqlize({core, ...option})
	const $initData = core.getService('initData')
	await $initData(data)
	
	return executableSchema
}
