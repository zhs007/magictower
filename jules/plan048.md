# Plan for Adding Image Background Removal Feature to Agent Ada

## 1. Understanding the Goal

The main goal is to enhance Agent Ada's capabilities by adding a tool to remove the background from images. This will allow the agent to generate game-ready assets with transparent backgrounds. The agent's workflow for creating and managing monster images needs to be updated to incorporate this new tool.

## 2. Project Requirements

- **New Tool:** Implement a new tool for Agent Ada called `rmbg`.
- **gRPC Integration:** The `rmbg` tool will call a gRPC service defined in `protos/rmbg.proto` to perform the background removal.
- **Environment Variable:** The address of the `rmbg` gRPC service must be configurable via an environment variable.
- **Image Storage:** The background-removed images should be saved in a publicly accessible directory named `monstereditorpublish` at the project root. The filename should be a hash of the image data. The tool should return a public URL to the saved image.
- **Updated Agent Workflow:** The agent's decision-making process needs to be updated to include the background removal step. The new flow should be:
    1. Generate an image with `genDoubaoImage`.
    2. After user approval of the generated image, call `rmbg` to remove the background.
    3. Show the background-removed image to the user for final confirmation.
    4. Upon final confirmation, save the image to `assets/monster/` using `saveMonsterImage`.
    5. Update the monster's info with the new asset ID using `updMonsterInfo`.
- **Documentation:**
    - Update the agent's system prompt in `monstereditor/prompts/system.md` to reflect the new workflow.
    - Create a task report `jules/plan048-report.md` after completion.
    - Update the main project documentation `jules.md`.
    - Update `agents.md` if necessary.

## 3. Task Breakdown

I will break down the task into the following steps:

1.  **Explore the Codebase:**
    - Examine `protos/rmbg.proto` to understand the gRPC service definition.
    - Analyze `apps/monstereditor/src/agent/doubao-client.ts` to understand how existing gRPC clients are implemented.
    - Review the current agent logic to identify where to insert the new functionality.
    - Check for an `AGENTS.md` file for any special instructions.

2.  **Implement the `rmbg` gRPC Client:**
    - Create a new file, likely `apps/monstereditor/src/agent/rmbg-client.ts`, to house the gRPC client for the `rmbg` service.
    - This client will handle the connection to the gRPC service and the `rmbg` remote procedure call.
    - It will read the service address from an environment variable.

3.  **Implement the `rmbg` Tool:**
    - In the agent's tool definition file, add the `rmbg` tool.
    - This tool will use the `rmbg-client` to call the service.
    - It will handle saving the returned image data to the `monstereditorpublish` directory with a hashed filename.
    - It will construct and return the public URL for the saved image.

4.  **Update Agent Logic and System Prompt:**
    - Modify the agent's main logic file to incorporate the new workflow. This involves adding the state and transitions for background removal and final confirmation.
    - Update `monstereditor/prompts/system.md` with the new, detailed workflow instructions for the agent.

5.  **Testing and Verification:**
    - I will need to ensure the new tool is correctly integrated and the agent follows the new logic. As I don't have a running `rmbg` service, I will focus on code correctness and integration, and might need to mock the service if possible or write code that is robust to service unavailability during development. I will verify all file creations and modifications.

6.  **Documentation:**
    - Once the implementation is complete, I will write the `jules/plan048-report.md` file.
    - Then, I will update `jules.md` with the design and implementation details.
    - Finally, I will review and update `agents.md` if needed.

7.  **Final Review and Submission:**
    - I will use `request_code_review()` to get feedback on my changes before submitting.
    - After addressing any feedback, I will submit the changes.
