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
    owner: GameObj<unknown> | null = null;
    constructor(
        /**
         * Call to permanently stop the event handler being
         * called and clean up all of the memory.
         */
        public stop: () => void
    ) { };
}

/**
 * Dispatcher for a single (unnamed) event.
 */
export class SingleEvent<A> {
    #cancelers = new WeakMap<(arg: A) => unknown, () => void>;
    #handlers = new RemovableSet<(arg: A) => unknown>;
    add(callback: (arg: A) => unknown): EventSubscriptionController {
        const wrappedCallback = (arg: A) => {
            if (controller.paused) return;
            if (controller.owner && controller.owner.isPaused()) return;
            return callback(arg);
        };
        const cancel = this.#handlers.push(wrappedCallback);
        const controller = new EventSubscriptionController(cancel);
        this.#cancelers.set(wrappedCallback, cancel);
        return controller;
    }
    addOnce(callback: (arg: A) => unknown): EventSubscriptionController {
        const controller = this.add(arg => (controller.stop(), callback(arg)));
        return controller;
    }
    next(): Promise<A> {
        return new Promise(resolve => this.addOnce(resolve));
    }
    size() { return this.#handlers.size; }
    clear() { this.#handlers.clear(); }
    /** Triggers the event */
    fire(arg: A) {
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
    on<N extends keyof E>(name: N, action: (arg: E[N]) => void): EventSubscriptionController {
        return (this.#handlers[name] ??= new SingleEvent).add(action);
    }
    once<N extends keyof E>(name: N, action: (arg: E[N]) => void): EventSubscriptionController {
        const controller = this.on(name, arg => (controller.stop(), action(arg)));
        return controller;
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
    off(name: keyof E) {
        delete this.#handlers[name];
    }
    /** Removes the handlers for every event */
    clear() { this.#handlers = {}; }
    size(name: keyof E) { return this.#handlers[name]?.size() ?? 0; }
}
