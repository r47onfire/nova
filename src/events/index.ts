import { isArray } from "lib0/array";
import { GameObj } from "../ecs/entity/GameObjType";

export const STOP_EVENT = Symbol("stop");

export class RemovableSet<T> extends Set<T> {
    push(value: T): () => void {
        this.add(value);
        return () => this.delete(value);
    }
}

/**
 * Handle for temporarily pausing, or permanently cancelling, an event listener being called.
 */
export class EventSubscriptionController {
    /**
     * If true, the event handler will not be called,
     * but this can be set to false again to resume.
     */
    paused = false;
    /**
     * The {@link GameObj} that this event is attached to.
     */
    owner: GameObj | null = null;
    constructor(
        /**
         * Call to permanently stop the event handler being
         * called and clean up all of the memory.
         */
        public stop: () => void
    ) { };
}

type EventCallback<TDetail> = (arg: TDetail) => (void | typeof STOP_EVENT);

/**
 * Dispatcher for a single (unnamed) event.
 */
export class SingleEvent<T> {
    #cancelers = new WeakMap<EventCallback<T>, () => void>;
    #handlers = new RemovableSet<EventCallback<T>>;
    add(callback: EventCallback<T>): EventSubscriptionController {
        const wrappedCallback = (arg: T) => {
            if (controller.paused) return;
            if (controller.owner?.isPaused()) return;
            return callback(arg);
        };
        const cancel = this.#handlers.push(wrappedCallback);
        const controller = new EventSubscriptionController(cancel);
        this.#cancelers.set(wrappedCallback, cancel);
        return controller;
    }
    addF(filter: T extends [infer K, any] ? (K | K[]) : never, callback: T extends [any, infer A] ? EventCallback<A> : never): EventSubscriptionController {
        return this.addP(((x: any) => equalOrIncludes(filter, x)) as any, callback);
    }
    addP(predicate: T extends [infer K, any] ? (x: K) => boolean : never, callback: T extends [any, infer A] ? EventCallback<A> : never): EventSubscriptionController {
        return this.add((arg: any) => {
            if (predicate(arg[0])) return callback(arg[1]);
        });
    }
    add1(callback: (arg: T) => void): EventSubscriptionController {
        const controller = this.add(arg => {
            controller.stop();
            callback(arg);
        });
        return controller;
    }
    next(): Promise<T> {
        return new Promise(resolve => this.add1(resolve));
    }
    get numListeners() { return this.#handlers.size; }
    clear() { this.#handlers.clear(); }
    /** Triggers the event */
    fire(arg: T) {
        this.#handlers.forEach(callback => {
            const result = callback(arg);
            if (result === STOP_EVENT) this.#cancelers.get(callback)?.();
        });
    }
}

/**
 * Dispatcher for named events
 */
export class EventDispatcher<E extends Record<string, any>> {
    #handlers: Partial<{ [N in keyof E]: SingleEvent<E[N]> }> = {};
    #getSingleEvent<N extends keyof E>(name: N): SingleEvent<E[N]> {
        return this.#handlers[name] ??= new SingleEvent;
    }
    on<N extends keyof E>(name: N, action: (arg: E[N]) => void): EventSubscriptionController {
        return this.#getSingleEvent(name).add(action);
    }
    onF<N extends keyof E>(name: N, filter: E[N] extends [infer X, any] ? (X | X[]) : never, action: E[N] extends [any, infer Y] ? EventCallback<Y> : never) {
        return this.#getSingleEvent(name).addF(filter, action);
    }
    onP<N extends keyof E>(name: N, predicate: E[N] extends [infer X, any] ? (x: X) => boolean : never, action: E[N] extends [any, infer Y] ? EventCallback<Y> : never) {
        return this.#getSingleEvent(name).addP(predicate, action);
    }
    once<N extends keyof E>(name: N, action: (arg: E[N]) => void): EventSubscriptionController {
        return this.#getSingleEvent(name).add1(action);
    }
    next<N extends keyof E>(name: N): Promise<E[N]> {
        return new Promise(resolve => this.once(name, resolve));
    }
    emit<N extends keyof E>(name: N & (E[N] extends void ? N : never)): void;
    emit<N extends keyof E>(name: N, arg: E[N]): void;
    emit(name: string, arg?: any) {
        this.#handlers[name]?.fire(arg);
    }
    /** Removes all the handlers for a given event name */
    off(name: keyof E) { delete this.#handlers[name]; }
    /** Removes the handlers for every event */
    clear() { this.#handlers = {}; }
    numListeners(name: keyof E) { return this.#handlers[name]?.numListeners ?? 0; }
}

const equalOrIncludes = <T>(list: T | T[], value: any): boolean => {
    return isArray(list) ? list.some(e => equalOrIncludes(e, value)) : list === value;
}
