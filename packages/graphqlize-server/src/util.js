import {task} from 'folktale/concurrency/task'
export const promiseToTask = promise => task(
	({resolve, reject}) => promise.then(resolve).catch(reject)
)