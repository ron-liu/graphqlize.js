import {
	of as taskOf,
	rejected as taskRejected,
	fromPromised as promiseToTask,
	do as taskDo,
	task
} from 'folktale/concurrency/task'

export const Box = x =>
	({
		map: f => Box(f(x)),
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

export {taskOf, taskRejected, promiseToTask, taskDo, task}
