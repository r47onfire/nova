
export interface InputManagerOptions {

}

export type InputEvents = {

};

/**
 * Handles getting input from all sources and firing input events
 *
 * (e.g. key events, mouse events, gamepad events, hide/show, etc)
 */
export class InputManager {
    constructor(
        options: InputManagerOptions,
        canvas: HTMLCanvasElement,
        outputFunc: <N extends keyof InputEvents>(name: N, value: InputEvents[N]) => void,
    ) {

    }
}
