# Remaining files

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "lib": ["ESNext", "DOM"],
    "types": ["bun"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src"]
}
```

`strict: true` is deliberate. Turning it off to clear errors defeats the reason for using TypeScript.

## vite.config.ts

```ts
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/client",
  build: {
    // Server serves from dist/client; path must match serveStatic root.
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
});
```

## .dockerignore

Keeps the build context small and prevents host artifacts from leaking into the image. `node_modules` especially — host binaries may not match the container architecture.

```
node_modules
dist
.git
.env
*.log
docker/
```

## .gitignore

```
node_modules
dist
.env
*.log
```

`.env` is ignored; `.env.example` is committed.

## src/client/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title><name></title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

## src/client/main.ts

```ts
const res = await fetch("/api/hello");
const data = await res.json();
document.querySelector("#app")!.textContent = data.message;
```
