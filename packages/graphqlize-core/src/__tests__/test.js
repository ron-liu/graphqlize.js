const {task} = require('folktale/concurrency/task')

const app = async ()  => {
	await task(({resolve, reject}) => setTimeout( ()=>resolve(1) , 10))
	.map(x=>{throw 'err'})
	.chain(x=> {
		throw 'error'
		return of(2)
	})
	.run()
	.promise()
}

app()