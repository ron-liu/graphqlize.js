// @flow

export type Fn0<B> = ( ...rest: Array<void>) => B
export type Fn1<A, B> = (a: A, ...rest: Array<void>) => B
export type Fn2<A, B, C> = (a: A, b: B, ...rest: Array<void>) => C
export type Fn3<A, B, C, D> = (a: A, b: B, c: C, ...rest: Array<void>) => D
export type Fn4<A, B, C, D, E> = (a: A, b: B, c: C, d: D, ...rest: Array<void>) => E
export type Fn4<A, B, C, D, E, F> = (a: A, b: B, c: C, d: D, e: E, ...rest: Array<void>) => F

export type CurriedFn2<A, B, C> =
	& Fn1<A, Fn1<B, C>>
	& Fn2<A, B, C>
export type CurriedFn3<A, B, C, D> =
	& Fn1<A, CurriedFn2<B, C, D>>
	& Fn2<A, B, Fn1<C, D>>
	& Fn3<A, B, C, D>
export type CurriedFn4<A, B, C, D, E> =
	& Fn1<A, CurriedFn3<B, C, D, E>>
	& Fn2<A, B, CurriedFn2<C, D, E>>
	& Fn3<A, B, C, Fn1<D, E>>
	& Fn4<A, B, C, D, E>
export type CurriedFn5<A, B, C, D, E, F> =
	& Fn1<A, CurriedFn4<B, C, D, E, F>>
	& Fn2<A, B, CurriedFn3<C, D, E, F>>
	& Fn3<A, B, C, CurriedFn2<D, E, F>>
	& Fn4<A, B, C, D, Fn1<E, F>>
	& Fn5<A, B, C, D, E, F>