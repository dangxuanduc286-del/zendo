import { register } from "node:module";

register(new URL("./shim-server-only-hook.mjs", import.meta.url), import.meta.url);
