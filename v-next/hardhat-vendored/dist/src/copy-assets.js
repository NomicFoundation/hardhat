import { cp } from "node:fs/promises";
import path from "node:path";
async function copyFolder(from, to) {
    const src = path.resolve(from);
    const dest = path.resolve(to);
    await cp(src, dest, { recursive: true, force: true });
    console.log(`Copied folder from ${src} -> ${dest}`);
}
// eslint-disable-next-line no-restricted-syntax -- allow in this post build script
await copyFolder(path.resolve(process.cwd(), "src", "coverage", "istanbul-reports", "lib", "html", "assets"), path.resolve(process.cwd(), "dist", "src", "coverage", "istanbul-reports", "lib", "html", "assets"));
//# sourceMappingURL=copy-assets.js.map