/**
 * Class that manages time and ticks the system
 */
export class TimeController {
    start(frameCallback: (dt: number) => void) {
        if (this.#loopID) cancelAnimationFrame(this.#loopID);
        this.#frameMain(0, frameCallback);
    }
    #lastTime = 0;
    #loopID: number | null = null;
    shouldStop = false;
    #frameMain(time: number, cb: (dt: number) => void) {
        if (this.shouldStop) {
            this.shouldStop = false;
            return;
        }
        time /= 1000; // input is in milliseconds, we want seconds
        const dt = time - this.#lastTime;
        this.#lastTime = dt;
        cb(dt);
        this.#loopID = requestAnimationFrame(t => this.#frameMain(t, cb));
    }
}
