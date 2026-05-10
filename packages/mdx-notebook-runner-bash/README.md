# mdx-notebook-runner-bash

Bash runner for mdx-notebook. Executes inline ` ```bash run id=… ` cells and `:::run{src="./script.sh" id=…}` file cells using `bash -c` / `bash <file>`.

## Usage

```ts
import { registerRunner } from "mdx-notebook-core";
import { runnerBash } from "mdx-notebook-runner-bash";
registerRunner(runnerBash);
```

Or as a side-effect import:

```ts
import "mdx-notebook-runner-bash/register";
```

## Capture

stdout / stderr line events with timestamps, exit code, duration, timeout (default 30s, override per cell). No default-export contract — bash is procedural; use stdout for output.
