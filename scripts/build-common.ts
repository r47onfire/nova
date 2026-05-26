import { BuildConfig } from "bun";
import glslPlugin from "bun-plugin-glsl";

export async function build(options: BuildConfig) {
    await Bun.build({
        sourcemap: true,
        target: "browser",
        format: "esm",
        define: { TEST: "false" },
        ...options,
        plugins: [
            glslPlugin({ minify: options.minify }),
            ...(options.plugins ?? [])
        ]
    });
}
