import { Renderer, StackKind } from "./Renderer";

export enum TexFilter {
    NEAREST,
    LINEAR,
}
export enum TexWrapMode {
    WRAP,
    CLAMP,
}
type ImageSource = Exclude<TexImageSource, VideoFrame>;

export class Texture {
    #renderer: Renderer;
    src: ImageSource | null = null;
    glTex: WebGLTexture;
    readonly width: number;
    readonly height: number;

    constructor(renderer: Renderer, w: number, h: number, filter: TexFilter = renderer.defTexFilter, wrapMode: TexWrapMode = TexWrapMode.CLAMP) {
        this.#renderer = renderer;

        const gl = renderer.gl;
        const tex = gl.createTexture();

        if (!tex) {
            throw new Error("too many textures");
        }

        this.glTex = tex;
        renderer.addCleanup(() => this.free());

        this.width = w;
        this.height = h;

        const { LINEAR, NEAREST, REPEAT, CLAMP_TO_EDGE, TEXTURE_2D, RGBA, UNSIGNED_BYTE, TEXTURE_MIN_FILTER, TEXTURE_MAG_FILTER, TEXTURE_WRAP_S, TEXTURE_WRAP_T, UNPACK_PREMULTIPLY_ALPHA_WEBGL } = gl;

        const nFilter = {
            [TexFilter.LINEAR]: LINEAR,
            [TexFilter.NEAREST]: NEAREST,
        }[filter];

        const nWrapMode = {
            [TexWrapMode.WRAP]: REPEAT,
            [TexWrapMode.CLAMP]: CLAMP_TO_EDGE,
        }[wrapMode];

        this.bind();
        if (w && h) {
            gl.texImage2D(
                TEXTURE_2D,
                0,
                RGBA,
                w,
                h,
                0,
                RGBA,
                UNSIGNED_BYTE,
                null,
            );
        }

        gl.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, nFilter);
        gl.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, nFilter);
        gl.texParameteri(TEXTURE_2D, TEXTURE_WRAP_S, nWrapMode);
        gl.texParameteri(TEXTURE_2D, TEXTURE_WRAP_T, nWrapMode);
        gl.pixelStorei(UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

        this.unbind();
    }

    static fromImage(
        renderer: Renderer,
        img: ImageSource,
        filter?: TexFilter,
        wrapMode?: TexWrapMode
    ): Texture {
        const tex = new Texture(renderer, img.width, img.height, filter, wrapMode);
        tex.update(img);
        tex.src = img;
        return tex;
    }

    update(img: ImageSource, x = 0, y = 0) {
        const gl = this.#renderer.gl;
        this.bind();
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            x,
            y,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img,
        );
        this.unbind();
    }

    bind() {
        this.#renderer.push(StackKind.TEXTURE_2D, this.glTex);
    }

    unbind() {
        this.#renderer.pop(StackKind.TEXTURE_2D);
    }

    /** Frees up texture memory. Call this once the texture is no longer being used to avoid memory leaks. */
    free() {
        this.#renderer.gl.deleteTexture(this.glTex);
    }
}