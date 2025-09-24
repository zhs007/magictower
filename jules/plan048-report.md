# Task Report: plan048 - Add Image Background Removal Feature

## 1. Task Summary

The goal of this task was to add a new capability to Agent Ada for removing the background from monster images. This involved creating a new gRPC client, a new agent tool (`rmbg`), updating the agent's workflow and instructions, and configuring the necessary environment variables.

## 2. Execution Process

The task was executed following the plan laid out in `jules/plan048.md`.

1.  **Code Exploration:** I began by exploring the codebase to understand the existing gRPC client implementation (`doubao-client.ts`), the agent tool definitions (`tools.ts`), and the agent's system prompt (`system.md`). This provided a clear path for the new implementation.

2.  **gRPC Client Implementation:** I created a new file `apps/monstereditor/src/agent/rmbg-client.ts` modeled after the existing `doubao-client.ts`. This client connects to the `rmbg` gRPC service using the `RMBG_GRPC_URL` environment variable.

3.  **Agent Tool Implementation:** I modified `apps/monstereditor/src/agent/tools.ts` to add the new `rmbg` tool. This involved:
    *   Importing the `removeBackground` function from the new client.
    *   Creating the `rmbg` async function that reads an image, calls the gRPC service, and saves the new image.
    *   Registering the new tool in the `tools` definition array and the `toolFunctions` map.

4.  **System Prompt Update:** I updated `apps/monstereditor/prompts/system.md` to instruct the agent on how to use the new tool. The workflow was modified to include a background removal step after image generation and before saving the final asset.

5.  **Configuration Update:** I added the new `RMBG_GRPC_URL` to the `.env.example` file to ensure developers are aware of the new configuration requirement.

6.  **Verification:** Throughout the process, I verified each file modification to ensure correctness and consistency.

## 3. Challenges and Solutions

The initial attempt to modify `apps/monstereditor/.env.example` failed because the search pattern for `replace_with_git_merge_diff` was incorrect.

*   **Problem:** The `replace_with_git_merge_diff` tool requires an exact match for the search block. My initial attempt used a slightly different format than what was in the file.
*   **Solution:** I used `read_file` to get the exact content of `.env.example` and constructed the correct search block, which then worked as expected.

Overall, the task was completed smoothly without any major blockers.

## 4. Final Outcome

The agent `Ada` now has a `rmbg` tool that can remove the background from images. The agent's instructions have been updated to incorporate this tool into its image generation workflow. The implementation is robust and follows the existing patterns in the codebase.
