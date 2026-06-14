import { max, min } from "lib0/math";
import Nova from "..";

export interface TimeControllerEvents {
    visibilitychange: boolean;
}

export interface TimeControllerOptions {
    maxFPS?: number;
    minFPS?: number;
    fixedHz?: number;
}

/**
 * Class that manages time and ticks the system
 */
export class TimeController {
    #game: Nova;
    #skipping = false;
    #minDT = 0;
    get maxFPS() { return 1 / this.#minDT; }
    set maxFPS(x: number) { this.#minDT = 1 / x; }
    #maxDT = 0.25;
    get minFPS() { return 1 / this.#maxDT; }
    set minFPS(x: number) { this.#maxDT = 1 / x; }
    // default = 160 Hz
    #fixedUpdateDT = 0.00625;
    get fixedHz() { return 1 / this.#fixedUpdateDT; }
    set fixedHz(x: number) { this.#fixedUpdateDT = 1 / x; }
    constructor(nova: Nova<any, any, any>, options: TimeControllerOptions) {
        this.#game = nova;
        if (options.maxFPS) this.maxFPS = options.maxFPS;
        if (options.minFPS) this.minFPS = options.minFPS;
        if (options.fixedHz) this.fixedHz = options.fixedHz;
        document.addEventListener("visibilitychange", this.#visibilityListener);
    }
    start(fixedUpdate: (dt: number) => void, update: (dt: number) => void) {
        if (this.#loopID) cancelAnimationFrame(this.#loopID);
        this.#frameCallback(0, fixedUpdate, update);
    }
    #lastTime = 0;
    #loopID: number | null = null;
    shouldStop = false;
    #updateAccumulator = 0;
    #fixedUpdateAccumulator = 0;
    dt = 0;
    time = 0;
    #frameCallback(time: number, fixedUpdate: (dt: number) => void, update: (dt: number) => void) {
        if (this.shouldStop) {
            this.shouldStop = false;
            return;
        }
        if (isVisible()) {
            time /= 1000; // input is in milliseconds, we want seconds
            const realDT = time - this.#lastTime;
            this.#lastTime = time;
            const clampedDT = min(realDT, this.#maxDT);
            this.dt = clampedDT;
            if (this.#skipping) {
                this.#skipping = false;
            } else {
                this.#updateAccumulator += clampedDT;
                this.#fixedUpdateAccumulator += clampedDT;
                while (this.#fixedUpdateAccumulator > this.#fixedUpdateDT) {
                    this.#fixedUpdateAccumulator -= this.#fixedUpdateDT;
                    fixedUpdate(this.#fixedUpdateDT);
                }
                // this.#timeSinceLastFixedUpdate = this.#fixedUpdateAccumulator;
                if (this.#updateAccumulator > this.#minDT) {
                    this.time += (this.dt = this.#minDT > 0 ? max(this.#minDT, clampedDT) : clampedDT);
                    // state.fpsCounter.tick(state.dt);
                    if (this.#minDT > 0) this.#updateAccumulator -= this.#minDT;
                    else this.#updateAccumulator = 0;
                    // state.numFrames++;
                    update(this.dt);
                }
            }
        }
        this.#loopID = requestAnimationFrame(t => this.#frameCallback(t, fixedUpdate, update));
    }
    destroy() {
        this.shouldStop = true;
        document.removeEventListener("visibilitychange", this.#visibilityListener);
    }
    visible = true;
    #visibilityListener = () => {
        // prevent a surge of dt when switch back after the tab being hidden for a while
        this.#game.emit("visibilitychange", (this.visible = isVisible()) && (this.#skipping = true));
    }
}

const isVisible = () => document.visibilityState === "visible";
