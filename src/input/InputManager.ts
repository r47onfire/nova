
export interface InputManagerOptions {

}

/**
 * Handles getting input from all sources and firing input events
 *
 * (e.g. key events, mouse events, gamepad events, window resize, hide/show, etc)
 */
export class InputManager {
    #eventQueue: [string, any][] = [];
    constructor(options: InputManagerOptions) {

    }
    queue(event: string, data?: any) {
        this.#eventQueue.push([event, data]);
    }
}
