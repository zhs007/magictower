# Plan 043: Implement Monster Editor Agent

## 1. My understanding of the requirements

The goal is to create a conversational agent that assists game designers in creating and balancing monster stats. The agent should be able to:
-   Understand user requests for monster creation, which can be specified by level, name, and characteristics (e.g., tank, DPS).
-   Guide the user if their request is underspecified, providing suggestions.
-   Use a set of predefined tools to interact with the game's data and logic.
-   The required tools are:
    -   `getAllMonsters()`: Get a list of all existing monsters.
    -   `getMonstersInfo(level)`: Get detailed stats for all monsters at a specific level.
    -   `updMonsterInfo(monsterData)`: Create or update a monster's data file.
    -   `simBattle(monsterId, playerLevel)`: Simulate a battle between a monster and a player of a certain level.
-   Iterate on monster stats by using the `updMonsterInfo` and `simBattle` tools until the user's requirements are met.
-   The core logic needs to be implemented within the existing `apps/monstereditor` backend.
-   The agent's system prompt (`apps/monstereditor/prompts/system.md`) must be updated to reflect these new capabilities and rules.
-   After implementation, I need to create a report (`jules/plan043-report.md`) and update the main project documentation (`jules.md`) and `agents.md` if necessary.

## 2. Goal

My goal is to implement a fully functional monster editor agent as described above. This involves creating the server-side tool functions, integrating them with the Gemini agent loop, and updating the necessary documentation.

## 3. Task Decomposition

I will break down the task into the following steps:

1.  **Update System Prompt:** I will first update the `apps/monstereditor/prompts/system.md` file. This will define the agent's persona, its capabilities, and the rules it must follow, including the interaction flow and the use of tools. This is a good first step as it clarifies the agent's contract.

2.  **Implement Tool Functions:** I will create a new file, `apps/monstereditor/src/agent/tools.ts`, to house the implementation of the four required tools.
    -   `getAllMonsters`: This will read the `gamedata/monsters/` directory and parse the monster names and levels from the filenames or file content.
    -   `getMonstersInfo`: This will read the JSON files for monsters of a given level from `gamedata/monsters/` and return their stats.
    -   `updMonsterInfo`: This will take monster data as input and write it to a JSON file in `gamedata/monsters/`. It will handle both creating new files and updating existing ones.
    -   `simBattle`: This will be the most complex tool. It will need to import and use the combat logic from the `packages/logic-core` package. I'll need to create temporary player and monster state objects and run them through the battle simulation function provided by `logic-core`.

3.  **Integrate Tools with Agent Logic:** I will modify `apps/monstereditor/src/agent/routes.ts`.
    -   I will adapt the `GET /api/agent/stream` route to use the Gemini Function Calling feature.
    -   The handler will be converted from a simple stream-in/stream-out to a multi-step loop:
        1.  Send user message + conversation history + tool definitions to Gemini.
        2.  Receive the response.
        3.  If the response contains a tool call, execute the corresponding function from `tools.ts`.
        4.  Send the tool's output back to Gemini to get a final, user-facing response.
        5.  Stream the final response back to the client.

4.  **Testing and Verification:** Since I am modifying the backend, I will need to run the `monstereditor` application and interact with the agent to manually verify that the new functionality works as expected. I will test:
    -   Creating a new monster.
    -   Updating an existing monster.
    -   The agent's ability to use the battle simulation and adjust stats.
    -   The agent's ability to correctly identify existing monsters.

5.  **Create Task Report:** Once the implementation is complete and verified, I will write the `jules/plan043-report.md` file, documenting the process, challenges, and solutions.

6.  **Update Project Documentation:** I will update `jules.md` to include a detailed section about the new Monster Editor Agent, its capabilities, and how it works.

7.  **Update `agents.md`:** Finally, I will review and update `agents.md` if any of the changes introduce new conventions or instructions that future agents should be aware of.
