# Beat your Goblin

Domain language for the game and its physics experiments.

## Language

**Goblin**: The character whose physical behavior and interactions are being developed.

**Arena**: The normal game environment with gameplay systems and presentation.

**Physics Lab**: A minimal controlled environment for investigating one physical behavior independently of the arena.

**Standing Lab**: The Physics Lab dedicated to investigating reliable Goblin standing.

**Standing time**: Simulation time until the first floor contact by a Goblin body part other than the feet.

**Baseline**: A reproducible reference experiment used to detect regressions and compare changes. It need not meet Standing acceptance.

**Standing time criterion**: At least 60 seconds under the Standing Lab measurement rule. Meeting this time criterion alone does not establish an accepted standing solution.

**Standing acceptance**: A standing solution that meets the time criterion and all additional acceptance criteria of its scoped experiment. Arena integration and game-world verification remain separate.

**Gate**: A scoped, independently verifiable task with acceptance criteria and explicit continuation or stop conditions.
