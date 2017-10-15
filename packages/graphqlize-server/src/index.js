// @flow

import type {GraphqlServerExpressOption} from './types'
import {createCore} from 'injectable-core'
import graphqlize from 'graphqlize-core'
import {create} from "../../graphqlize-core/src/resolve";

export const startServer: GraphqlServerExpressOption => void
= option => {
	const {port = 3000, schemaFilePattern, serviceFilePattern, connection} = option
	const core = createCore()
	
}