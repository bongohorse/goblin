# Beat your Goblin

Domain language for the game and its physics experiments.

## Language

**Goblin**: The character whose physical behavior and interactions are being developed.

**Arena**: The normal game environment with gameplay systems and presentation.

**Physics Lab**: A minimal controlled environment for investigating one physical behavior independently of the arena.

**Standing Lab**: The Physics Lab dedicated to investigating reliable Goblin standing.

**Standing time**: Simulation time until the first floor contact by a Goblin body part other than the feet. A valid stopped observation without that contact gives a lower bound, not an observed contact time. Invalid measurements establish no valid bound.

**Observed duration**: Simulation time actually observed before a run ends. It may end at contact, timeout, a protocol failure or a safety/technical stop.

**Right-censored contact time**: In a valid observation, the first non-foot contact was not observed before the run stopped; its time is unknown beyond the observed duration. This does not turn a failed acceptance criterion into a pass.

**Baseline**: A reproducible reference experiment used to detect regressions and compare changes. It need not meet Standing acceptance.

**Standing time criterion**: At least 60 seconds under the Standing Lab measurement rule. Meeting this time criterion alone does not establish an accepted standing solution.

**Standing acceptance**: A **fully dynamic unassisted physics-research** solution that meets the time criterion and all additional acceptance criteria of its scoped experiment. Arena integration and game-world verification remain separate.

**Gameplay assist**: An intentionally configured aid (e.g. IK, animation, bounded stabilizing force, supported/kinematic movement). Valid for the game when documented, reliable and collision-aware; never counts as unassisted research Standing.

**Gameplay prototype**: A small player-testable implementation of the interaction loop, permitted to use labelled assists, with its own interaction, interruption, recovery and performance checks.

**Motion ownership**: The explicit assignment of authority for a body/bone/transform to Rapier dynamics, animation or supported movement in each game state; avoid simultaneous writers.

**Gate**: A scoped, independently verifiable task with acceptance criteria and explicit continuation or stop conditions.
