import { Renderer, StackKind } from "./Renderer";
import { Texture } from "./Texture";

export class FrameBuffer {
    #renderer: Renderer;
    #tex: Texture;
    #glFramebuffer: WebGLFramebuffer;
    #glRenderbuffer: WebGLRenderbuffer;

    constructor(renderer: Renderer, tex: Texture) {
        this.#renderer = renderer;
        const gl = renderer.gl;
        renderer.addCleanup(() => this.free());
        this.#tex = tex;

        const frameBuffer = gl.createFramebuffer();
        const renderBuffer = gl.createRenderbuffer();

        if (!frameBuffer || !renderBuffer) {
            throw new Error("Failed to create framebuffer");
        }

        this.#glFramebuffer = frameBuffer;
        this.#glRenderbuffer = renderBuffer;

        this.bind();
        const { RENDERBUFFER, FRAMEBUFFER, DEPTH_STENCIL, COLOR_ATTACHMENT0, TEXTURE_2D, DEPTH_STENCIL_ATTACHMENT } = gl;
        gl.renderbufferStorage(RENDERBUFFER, DEPTH_STENCIL, tex.width, tex.height);
        gl.framebufferTexture2D(
            FRAMEBUFFER,
            COLOR_ATTACHMENT0,
            TEXTURE_2D,
            this.#tex.glTex,
            0,
        );
        gl.framebufferRenderbuffer(
            FRAMEBUFFER,
            DEPTH_STENCIL_ATTACHMENT,
            RENDERBUFFER,
            this.#glRenderbuffer,
        );
        this.unbind();
    }

    get width() {
        return this.#tex.width;
    }

    get height() {
        return this.#tex.height;
    }

    toImageData() {
        const gl = this.#renderer.gl;
        const data = new Uint8ClampedArray(this.width * this.height * 4);
        this.bind();
        gl.readPixels(
            0,
            0,
            this.width,
            this.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data,
        );
        this.unbind();
        // flip vertically, because webgl is weird
        const bytesPerRow = this.width * 4;
        const temp = new Uint8Array(bytesPerRow);
        for (let y = 0; y < (this.height / 2 | 0); y++) {
            const topOffset = y * bytesPerRow;
            const bottomOffset = (this.height - y - 1) * bytesPerRow;
            temp.set(data.subarray(topOffset, topOffset + bytesPerRow));
            data.copyWithin(
                topOffset,
                bottomOffset,
                bottomOffset + bytesPerRow,
            );
            data.set(temp, bottomOffset);
        }
        return new ImageData(data, this.width, this.height);
    }

    toDataURL() {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = this.width;
        canvas.height = this.height;

        if (!ctx) throw new Error("couldn't get canvas context");

        ctx.putImageData(this.toImageData(), 0, 0);
        return canvas.toDataURL();
    }

    clear() {
        const gl = this.#renderer.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    draw(action: () => void) {
        this.bind();
        action();
        this.unbind();
    }

    bind() {
        this.#renderer.push(StackKind.FRAME_BUFFER, this.#glFramebuffer);
        this.#renderer.push(StackKind.RENDER_BUFFER, this.#glRenderbuffer);
        this.#renderer.push(StackKind.VIEWPORT, { x: 0, y: 0, w: this.width, h: this.height });
    }

    unbind() {
        this.#renderer.pop(StackKind.FRAME_BUFFER);
        this.#renderer.pop(StackKind.RENDER_BUFFER);
        this.#renderer.pop(StackKind.VIEWPORT);
    }

    free() {
        const gl = this.#renderer.gl;
        gl.deleteFramebuffer(this.#glFramebuffer);
        gl.deleteRenderbuffer(this.#glRenderbuffer);
        this.#tex.free();
    }
}
