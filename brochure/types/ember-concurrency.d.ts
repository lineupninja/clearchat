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
