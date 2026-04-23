# Install & Prime

## Read
.env.example (never read .env)

## Read and Execute
.opencode/commands/prime.md

## Run
- Run `cp .env.example .env` to create local environment file
- Install project dependencies (use the command from AGENTS.md Development Commands > Setup)
- If ADW framework is not yet installed, run the install script or `adws init`

## Report
- Output the work you've just done in a concise bullet point list.
- Instruct the user to fill out the root level ./.env based on .env.example.
- Mention: 'To setup your AFK Agent, be sure to update the remote repo url and push to a new repo so you have access to git issues and git prs:
  ```
  git remote add origin <your-new-repo-url>
  git push -u origin main
  ```'
