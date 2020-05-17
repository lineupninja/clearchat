declare module 'ember-concurrency' {

    export function task(task: (...args: any[]) => EmberConcurrencyFunctionReturn): EmberConcurrencyTask;

    export function timeout(ms: number): Promise<void>;

    export type Task<T, U> = {
        isRunning: boolean;
        isQueued: boolean;
        isIdle: boolean;
        state: 'running' | 'queued' | 'idle';
        last?: TaskInstance;
        lastRunning?: TaskInstance;
        lastPerformed?: TaskInstance;
        lastSuccessful?: TaskInstance;
        lastComplete?: TaskInstance;
        lastErrored?: TaskInstance;
        lastCanceled?: TaskInstance;
        lastIncomplete?: TaskInstance;
        performCount: number;
        toString(): string;
        perform(...args: any[]): EmberConcurrencyFunctionReturn;
        drop(): Task<T, U>,
        keepLatest(): Task<T, U>,
        restartable(): Task<T, U>,
        enqueue(): Task<T, U>,
        maxConcurrency(number: number): void;
        cancelAll(): void;
    }
    export type GeneratorFn<T, U, V> = any;

    export type TaskProperty = (...args: any) => any;

}

export type EmberConcurrencyTask = Task<any[], unknown> | Task0 | Task1<any> | Task2<any, any> | Task3<any, any, any>;
// @ts-ignore - Generator type IS generic but compiler issues error saying it's not
export type EmberConcurrencyFunctionReturn = Generator<any, any, any>;

export type TaskInstance = {
    isSuccessful: boolean;
    isError: boolean;
    /**
     * The value is 'null' until the task instance completes
     * if the task fails then it remains null
     */
    value: unknown | null;
    error?: unknown;
}

export type Task0 = {
    isRunning: boolean;
    isQueued: boolean;
    isIdle: boolean;
    state: 'running' | 'queued' | 'idle';
    last?: TaskInstance;
    lastRunning?: TaskInstance;
    lastPerformed?: TaskInstance;
    lastSuccessful?: TaskInstance;
    lastComplete?: TaskInstance;
    lastErrored?: TaskInstance;
    lastCanceled?: TaskInstance;
    lastIncomplete?: TaskInstance;
    performCount: number;
    toString(): string;
    perform(): EmberConcurrencyFunctionReturn;
    drop(): Task0,
    keepLatest(): Task0,
    restartable(): Task0,
    enqueue(): Task0,
    maxConcurrency(number: number): void;
    cancelAll(): void;
}


export type Task1<T> = {

    isRunning: boolean;
    isQueued: boolean;
    isIdle: boolean;
    state: 'running' | 'queued' | 'idle';
    last?: TaskInstance;
    lastRunning?: TaskInstance;
    lastPerformed?: TaskInstance;
    lastSuccessful?: TaskInstance;
    lastComplete?: TaskInstance;
    lastErrored?: TaskInstance;
    lastCanceled?: TaskInstance;
    lastIncomplete?: TaskInstance;
    performCount: number;
    toString(): string;
    perform(arg1: T): EmberConcurrencyFunctionReturn;
    drop(): Task1<T>,
    keepLatest(): Task1<T>,
    restartable(): Task1<T>,
    enqueue(): Task1<T>,
    maxConcurrency(number: number): void;
    cancelAll(): void;
}

export type Task2<T, U> = {
    isRunning: boolean;
    isQueued: boolean;
    isIdle: boolean;
    state: 'running' | 'queued' | 'idle';
    last?: TaskInstance;
    lastRunning?: TaskInstance;
    lastPerformed?: TaskInstance;
    lastSuccessful?: TaskInstance;
    lastComplete?: TaskInstance;
    lastErrored?: TaskInstance;
    lastCanceled?: TaskInstance;
    lastIncomplete?: TaskInstance;
    performCount: number;
    toString(): string;
    perform(arg1: T, arg2: U): EmberConcurrencyFunctionReturn;
    drop(): Task2<T, U>,
    keepLatest(): Task2<T, U>,
    restartable(): Task2<T, U>,
    enqueue(): Task2<T, U>,
    maxConcurrency(number: number): void;
    cancelAll(): void;
}

export type Task3<T, U, V> = {

    isRunning: boolean;
    isQueued: boolean;
    isIdle: boolean;
    state: 'running' | 'queued' | 'idle';
    last?: TaskInstance;
    lastRunning?: TaskInstance;
    lastPerformed?: TaskInstance;
    lastSuccessful?: TaskInstance;
    lastComplete?: TaskInstance;
    lastErrored?: TaskInstance;
    lastCanceled?: TaskInstance;
    lastIncomplete?: TaskInstance;
    performCount: number;
    toString(): string;
    perform(arg1: T, arg2: U, arg3: V): EmberConcurrencyFunctionReturn;
    drop(): Task3<T, U, V>,
    keepLatest(): Task3<T, U, V>,
    restartable(): Task3<T, U, V>,
    enqueue(): Task3<T, U, V>,
    maxConcurrency(number: number): void;
    cancelAll(): void;

}

export type Task4<T, U, V, W> = {

    isRunning: boolean;
    isQueued: boolean;
    isIdle: boolean;
    state: 'running' | 'queued' | 'idle';
    last?: TaskInstance;
    lastRunning?: TaskInstance;
    lastPerformed?: TaskInstance;
    lastSuccessful?: TaskInstance;
    lastComplete?: TaskInstance;
    lastErrored?: TaskInstance;
    lastCanceled?: TaskInstance;
    lastIncomplete?: TaskInstance;
    performCount: number;
    toString(): string;
    perform(arg1: T, arg2: U, arg3: V, arg4: W): EmberConcurrencyFunctionReturn;
    drop(): Task4<T, U, V, W>,
    keepLatest(): Task4<T, U, V, W>,
    restartable(): Task4<T, U, V, W>,
    enqueue(): Task4<T, U, V, W>,
    maxConcurrency(number: number): void;
    cancelAll(): void;

}

export type TaskUnknown = {
    isRunning: boolean;
    isQueued: boolean;
    isIdle: boolean;
    state: 'running' | 'queued' | 'idle';
    last?: TaskInstance;
    lastRunning?: TaskInstance;
    lastPerformed?: TaskInstance;
    lastSuccessful?: TaskInstance;
    lastComplete?: TaskInstance;
    lastErrored?: TaskInstance;
    lastCanceled?: TaskInstance;
    lastIncomplete?: TaskInstance;
    performCount: number;
    toString(): string;
    perform(...args: any[]): EmberConcurrencyFunctionReturn;
    drop(): TaskUnknown,
    keepLatest(): TaskUnknown,
    restartable(): TaskUnknown,
    enqueue(): TaskUnknown,
    maxConcurrency(number: number): void;
    cancelAll(): void;
}
