/** Redirect `server-only` → module rỗng (tsx / ESM). */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      url: "data:text/javascript,export%20default%20undefined",
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
