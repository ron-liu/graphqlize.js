import {List, Range} from 'immutable-ext'
import {taskOf} from "../util/hkt";
import {K} from "../util/functions";
import {tap} from "ramda";

test('traverse List empty array should still return task', async () => {
	await List([])
		.traverse(taskOf, K(taskOf))
		.run()
		.promise()
})

const {task, of} = require('folktale/concurrency/task') // using folktale 2.x
const buildTask = (n, ms) => task(({resolve}) => setTimeout( ()=> {
		console.log(n)
		resolve(n)
	}, ms
))

test('sequentially', async () => {
	const {List} = require('immutable-ext')
	
	await List.of(
		() => buildTask(1, 1000),
		() => buildTask(2, 1000),
		() => buildTask(3, 1000)
	)
	.traverse(of, f => f())
	.map(x=>x.toArray())
	.map(tap(console.log))
	.run()
	.promise()
})

test.skip('sequentially using ap', async () => {
	const {List} = require('immutable-ext')
	
	await List.of(
		() => buildTask(1, 1000),
		() => buildTask(2, 1000),
		() => buildTask(3, 1000)
	)
	.ap(List.of(1))
	.sequence(of)
	.run()
	.promise()
})

test.skip('sequentially using List', async () => {
	const {List} = require('immutable')
	List.prototype.traverse = function(point, f) {
		return this.reduce((ys, x) =>
			// f(x).map(x => y => y.concat([x])).ap(ys), point(this.empty))
			ys.map(x => y => x.concat([y])).ap(f(x)), point(this.empty))
	}
	
	await List.of(
		() => buildTask(1, 1000),
		() => buildTask(2, 1000),
		() => buildTask(3, 1000)
	)
	.traverse(of, f => f())
	.map(x=>x.toArray())
	.map( console.log)
	.run()
	.promise()
})