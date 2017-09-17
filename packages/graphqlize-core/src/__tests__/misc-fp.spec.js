import {task, of} from 'folktale/concurrency/task'
import {converge} from 'ramda'

const getDbConnection = () =>
	task(({resolve}) => resolve({id: `connection${Math.floor(Math.random()* 100)}`})
)

const findOneAccount = connection =>
	task(({resolve}) => resolve({name:"ron", id: `account-${connection.id}`}))

const createToken = connection => accountId =>
	task(({resolve}) => resolve({accountId, id: `token-${connection.id}-${accountId}`}))

const liftA2 = f => (x, y) => x.map(f).ap(y)

test('attempt#1 pass the output one by one till the step needs: too many passing around', async () => {
	const result = await getDbConnection()
		.chain(conn => findOneAccount(conn).map(account => [conn, account.id])) // pass the connection to next step
		.chain(([conn, userId]) => createToken(conn)(userId))
		.map(x=>x.id)
		.run()
		.promise()
	
	console.log(result) // token-connection90-account-connection90
})

test('attempt#2 use ramda converge and liftA2: nested ugly', async () => {
	const result = await getDbConnection()
		.chain(converge(
			liftA2(createToken),
			[
				of,
				conn => findOneAccount(conn).map(x=>x.id)
			]
		))
		.chain(x=>x)
		.map(x=>x.id)
		.run()
		.promise()
	
	console.log(result) // token-connection59-account-connection59
})

test('attempt#3 extract shared steps: wrong',  async () => {
	const connection = getDbConnection()
	
	const accountId = connection
	.chain(conn => findOneAccount(conn))
	.map(result => result.id)
	
	const result = await of(createToken)
	.ap(connection)
	.ap(accountId)
	.chain(x=>x)
	.map(x=>x.id)
	.run()
	.promise()
	
	console.log(result) // token-connection53-account-connection34, wrong: get connection twice
})

test('attempt#4 put all outputs into a state which will pass through',  async () => {
	const result = await getDbConnection()
	.map(x=>({connection: x}))
	.map(({connection}) => ({
		connection,
		account: findOneAccount(connection)
	}))
	.chain(({account, connection})=>
		account.map(x=>x.id)
		.chain(createToken(connection))
	)
	.map(x=>x.id)
	.run()
	.promise()
	
	
	console.log(result) //     token-connection75-account-connection75
})

test.only('attempt#5 use do co', async () => {
	const mdo = require('fantasy-do')
	
	const app = mdo(function * () {
		const connection = yield getDbConnection()
		const account =  yield findOneAccount(connection)
		
		return createToken(connection)(account.id).map(x=>x.id)
	})
	
	const result = await app.run().promise()

	console.log(result)
})