import {
	of as taskOf,
	rejected as taskRejected,
	do as taskDo,
	task,
	waitAll as taskAll,
	fromPromised as taskifyPromiseFn
} from 'folktale/concurrency/task'

export const Box = x =>
	({
		map: f => Box(f(x)),
		ap: g => g.map(x),
		fold: f => f(x),
		inspect: () => `Box(${x})`
	})

export const resultToTask = x => x.fold(taskRejected, taskOf)

export const validationToTask = resultToTask

export const taskTry = fn => {
	try {
		return taskOf(fn())
	}
	catch (e) {
		return taskRejected(e)
	}
}

export const promiseToTask = promise => task(
	({resolve, reject}) => promise.then(resolve).catch(reject)
)

export {taskOf, taskRejected, taskDo, task, taskAll, taskifyPromiseFn}
