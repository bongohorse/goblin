# Upstream Skills Attribution

The repo-local skills in `.agents/skills/` include adapted material from the following MIT-licensed projects.

## Matt Pocock Skills

Source:
https://github.com/mattpocock/skills

The 2026-10-06 workflow update adapts `implement-spec`, `pr`, `retro` and
`domain-modeling` from tag `v1.3.1`, commit
`24fe0ef7737efae15c87225755e9f6f5965e4888`.
Sources: https://github.com/mattpocock/skills/tree/v1.3.1/skills/engineering
and release notes for v1.3.0/v1.3.1.
Goblin adaptations preserve research gates, draft PRs, local skill loading,
meaningful regression checks and user-requested retrospectives/orchestration.
The `pr` visual-summary concept also credits Dex Horthy / Humanlayer's
`show-me`: https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md
No additional upstream helper skills or global configuration are installed.

MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE.

## Three.js Awesome Graphics Agent Skills

Source:
https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills

MIT License

Copyright (c) 2026 Scott Sun

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE.

## Three.js Game Skills

Source:
https://github.com/majidmanzarpour/threejs-game-skills

MIT License

Copyright (c) 2026 Majid Manzarpour

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE.

## WebGPU Claude Skill (conceptual reference)

Source:
https://github.com/dgreenheck/webgpu-claude-skill

The upstream README states that the project is MIT-licensed, but no standalone
`LICENSE` file was present when this repository was checked on 2026-10-02.
The Goblin skills derived from this reference were therefore rewritten from
scratch for this project rather than copied verbatim. They use the upstream
project only as a conceptual/topic reference for WebGPU, TSL, compute, device
limits and device-loss concerns.

## Rapier official repository

Source:
https://github.com/dimforge/rapier

License: Apache License 2.0
Copyright 2020 Sébastien Crozet

The Goblin Rapier skills are project-specific summaries and operating rules derived from the public Rapier JavaScript/TypeScript documentation, examples, changelog and source interfaces. They are not copies of Rapier implementation code.

Upstream master may describe APIs newer than the version installed by this project, so each skill requires explicit installed-version compatibility checks before implementation.

## Three.js official repository

Source:
https://github.com/mrdoob/three.js

The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

The Goblin Three.js core skills are project-specific summaries and operating
rules derived from official Three.js docs, manual pages, examples and source.
The upstream `dev` branch is not assumed to be API-identical to the installed
release; compatibility must be checked before using dev-only APIs.
