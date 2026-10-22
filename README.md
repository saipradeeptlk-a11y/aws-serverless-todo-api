# AWS Serverless To-Do API

A full-stack to-do application built with a serverless REST API (AWS SAM, Lambda, API Gateway, DynamoDB) and a React frontend. It runs locally against DynamoDB Local, and it is deployed to AWS (API) and Vercel (frontend).

## Live demo

| | Link |
|---|---|
| Frontend (Vercel) | https://aws-serverless-todo-api-phi.vercel.app |
| API (AWS, `ap-south-1`) | https://957zmah6bl.execute-api.ap-south-1.amazonaws.com/Prod |
| Source code | https://github.com/saipradeeptlk-a11y/aws-serverless-todo-api |

Quick check that the API is alive:

```powershell
Invoke-RestMethod -Method Get -Uri https://957zmah6bl.execute-api.ap-south-1.amazonaws.com/Prod/tasks
```

> The demo has no login, so every visitor sees and edits the same task list. The AWS stack may be removed after assessment, so the links above may stop working.

## Features

- Create, read, update and delete tasks (full CRUD)
- Three task statuses: `not_started`, `pending`, `completed`
- Input validation on both the frontend and the API
- Data persists in DynamoDB (DynamoDB Local in development, DynamoDB on AWS)
- React frontend with a light design, today's date header and a selectable accent colour
- Deployed to the cloud: API on AWS, frontend on Vercel

## Architecture

```
React (Vite)  ->  API Gateway  ->  Lambda (Node.js 22)  ->  DynamoDB
```

| Environment | Frontend | API | Database |
|---|---|---|---|
| Local | `localhost:5173` | `sam local start-api` on `127.0.0.1:3000` | DynamoDB Local (Docker) |
| Cloud | Vercel | API Gateway `Prod` stage in `ap-south-1` | DynamoDB table `TasksTable` |

Locally, `sam local start-api` emulates API Gateway and runs each Lambda in a Docker container. The containers reach DynamoDB Local over a shared Docker network. In the cloud, the whole backend is created by one CloudFormation stack (`todo-api`) from `template.yaml`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, hosted on Vercel |
| API | AWS SAM, API Gateway, AWS Lambda (Node.js 22) |
| Database | DynamoDB (DynamoDB Local for development) |
| SDK | AWS SDK v3 (`@aws-sdk/lib-dynamodb`) |
| Tooling | Docker, AWS CLI, SAM CLI, Git and GitHub |

## Project structure

```
.
├── template.yaml        # SAM template: parameters, table, functions, routes, CORS, outputs
├── samconfig.toml       # Deploy settings (stack name, region, parameter values)
├── src/
│   ├── createTask.mjs   # POST   /tasks
│   ├── getTasks.mjs     # GET    /tasks
│   ├── updateTask.mjs   # PUT    /tasks/{id}
│   └── deleteTask.mjs   # DELETE /tasks/{id}
└── frontend/            # React app
    ├── .env.example
    └── src/
        ├── api/tasksApi.js
        ├── components/TaskForm.jsx
        ├── App.jsx
        └── App.css
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running, for local development)
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- An AWS account with an IAM user that can create CloudFormation, Lambda, API Gateway, DynamoDB and IAM resources (only needed to deploy)

The commands below are for PowerShell on Windows.

## Local setup

### 1. Clone the repository

```powershell
git clone https://github.com/saipradeeptlk-a11y/aws-serverless-todo-api.git
cd aws-serverless-todo-api
```

### 2. Create the Docker network

The Lambda containers and DynamoDB Local must share a network.

```powershell
docker network create sam-local
```

### 3. Start DynamoDB Local

```powershell
docker run -d --name dynamodb-local --network sam-local -p 8000:8000 --restart unless-stopped -u root -v dynamodb-data:/home/dynamodblocal/data amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -dbPath /home/dynamodblocal/data
```

Data is stored in the `dynamodb-data` Docker volume, so it survives container restarts. `docker volume rm dynamodb-data` resets it.

### 4. Create the table

```powershell
aws dynamodb create-table --table-name TasksTable --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST --endpoint-url http://localhost:8000
```

If the AWS CLI asks for credentials or a region, run `aws configure` and enter any placeholder values (for example `local`, and region `us-east-1`). DynamoDB Local does not validate them.

Check it exists:

```powershell
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### 5. Build and start the API

```powershell
sam build
sam local start-api --docker-network sam-local --skip-pull-image --parameter-overrides DynamoEndpoint=http://dynamodb-local:8000
```

The API is now at `http://127.0.0.1:3000`. Leave this terminal open.

`DynamoEndpoint` tells the Lambda code to use DynamoDB Local instead of the real service. In the cloud it is left empty, so the SDK uses AWS DynamoDB.

> On Windows, stop `start-api` (Ctrl+C) before running `sam build` again, because the running containers lock the build folder.

### 6. Start the frontend

In a new terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the address Vite prints (usually `http://localhost:5173`).

The frontend reads the API address from `frontend/.env`:

```
# local API
VITE_API_URL=http://127.0.0.1:3000

# cloud API (no trailing slash)
# VITE_API_URL=https://957zmah6bl.execute-api.ap-south-1.amazonaws.com/Prod
```

Vite reads `.env` only at startup, so restart `npm run dev` after changing it.

## Deploying to AWS

### 1. Configure credentials

```powershell
aws configure
```

Enter the access key and secret key of your IAM user and the region `ap-south-1`. Never commit these keys.

### 2. Build and deploy

From the project root (the folder containing `template.yaml`):

```powershell
sam build
sam deploy --guided
```

Use these answers the first time:

| Prompt | Value |
|---|---|
| Stack name | `todo-api` |
| AWS Region | `ap-south-1` |
| Parameter `TableName` | `TasksTable` |
| Parameter `DynamoEndpoint` | empty (leave blank) |
| Parameter `FrontendOrigin` | the address of your frontend, for example `https://aws-serverless-todo-api-phi.vercel.app` |
| Confirm changes before deploy | `y` |
| Allow SAM CLI IAM role creation | `y` |
| Save arguments to `samconfig.toml` | `y` |

After the first time, a plain `sam build` followed by `sam deploy` is enough. SAM shows a change set and asks `Deploy this changeset? [y/N]`. The stack outputs show the API URL.

### 3. What gets created

- A DynamoDB table (`TasksTable`)
- Four Lambda functions with permissions for that table only
- An API Gateway REST API with a `Prod` stage and the routes under `/tasks`
- IAM roles for the functions

### 4. Test the cloud API

```powershell
# create
Invoke-RestMethod -Method Post -Uri https://957zmah6bl.execute-api.ap-south-1.amazonaws.com/Prod/tasks -ContentType "application/json" -Body '{"title":"Buy milk","status":"pending"}'

# list
Invoke-RestMethod -Method Get -Uri https://957zmah6bl.execute-api.ap-south-1.amazonaws.com/Prod/tasks

# 404 check (id that does not exist)
curl.exe -i -X PUT -H "Content-Type: application/json" -d '{\"status\":\"completed\"}' https://957zmah6bl.execute-api.ap-south-1.amazonaws.com/Prod/tasks/does-not-exist
```

Check that the CORS header is present for your frontend:

```powershell
curl.exe -i -H "Origin: https://aws-serverless-todo-api-phi.vercel.app" https://957zmah6bl.execute-api.ap-south-1.amazonaws.com/Prod/tasks
```

The response must contain `Access-Control-Allow-Origin: https://aws-serverless-todo-api-phi.vercel.app`.

### 5. Delete everything when finished

```powershell
sam delete --stack-name todo-api
```

This removes the API, functions, table and roles, and stops any charges.

## Deploying the frontend (Vercel)

1. Push the repository to GitHub.
2. In Vercel, choose **Add New > Project** and import the repository.
3. Set **Root Directory** to `frontend`. The build settings are detected automatically (`npm run build`, output `dist`).
4. Add an environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://957zmah6bl.execute-api.ap-south-1.amazonaws.com/Prod` (no trailing slash)
5. Click **Deploy**.
6. Copy the production domain (for example `https://aws-serverless-todo-api-phi.vercel.app`).
7. Put that domain into the `FrontendOrigin` value in `samconfig.toml`, then redeploy the backend:

```toml
parameter_overrides = "TableName=\"TasksTable\" DynamoEndpoint=\"\" FrontendOrigin=\"https://aws-serverless-todo-api-phi.vercel.app\""
```

```powershell
sam build
sam deploy
```

Vercel redeploys automatically on every push to `main`.

### How CORS works here

A browser only accepts a response from another origin if it carries an `Access-Control-Allow-Origin` header that matches the page's origin. The `FrontendOrigin` parameter feeds two places:

- the API Gateway CORS setting, which answers the browser's preflight request
- the `ALLOWED_ORIGIN` environment variable, which every Lambda handler puts in the `Access-Control-Allow-Origin` header of every response (success and error)

The API allows only one origin at a time. When `FrontendOrigin` is the Vercel address, a frontend running on `localhost:5173` against the cloud API will show "Failed to fetch". Use the local API (`http://127.0.0.1:3000`) for local work, or redeploy with `FrontendOrigin=http://localhost:5173`.

## API reference

Base URL (local): `http://127.0.0.1:3000`
Base URL (cloud): `https://957zmah6bl.execute-api.ap-south-1.amazonaws.com/Prod`

| Method | Path | Body | Success response |
|---|---|---|---|
| POST | `/tasks` | `{ "title": "...", "status": "pending" }` | `201` with the created task |
| GET | `/tasks` | none | `200` with an array of tasks |
| PUT | `/tasks/{id}` | `{ "status": "completed" }` | `200` with the updated task |
| DELETE | `/tasks/{id}` | none | `200` with a confirmation message |

A task looks like this:

```json
{
  "id": "0d73101b-fd46-4f7b-a78d-f3d99d07eb73",
  "title": "Buy milk",
  "status": "pending",
  "createdAt": "2026-10-20T10:15:00.000Z"
}
```

`status` must be one of `not_started`, `pending`, `completed`.

Errors return JSON such as `{ "message": "title and status are required" }`:

| Status | Meaning |
|---|---|
| 400 | Invalid JSON, missing title or status, or an invalid status |
| 404 | PUT on an id that does not exist |
| 500 | The database call failed |

## Testing

### API (PowerShell)

Replace the base URL with the cloud URL to test the deployed API.

```powershell
# create
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/tasks -ContentType "application/json" -Body '{"title":"Buy milk","status":"pending"}'

# list
Invoke-RestMethod -Method Get -Uri http://127.0.0.1:3000/tasks

# update (replace <id>)
Invoke-RestMethod -Method Put -Uri http://127.0.0.1:3000/tasks/<id> -ContentType "application/json" -Body '{"status":"completed"}'

# delete (replace <id>)
Invoke-RestMethod -Method Delete -Uri http://127.0.0.1:3000/tasks/<id>
```

Failure cases to try (PowerShell prints an error for non-2xx responses, which is expected):

```powershell
# 400: missing title
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/tasks -ContentType "application/json" -Body '{"status":"pending"}'

# 400: invalid status
Invoke-RestMethod -Method Put -Uri http://127.0.0.1:3000/tasks/anything -ContentType "application/json" -Body '{"status":"banana"}'

# 404: id that does not exist
Invoke-RestMethod -Method Put -Uri http://127.0.0.1:3000/tasks/does-not-exist -ContentType "application/json" -Body '{"status":"completed"}'
```

### Frontend

1. Add a task: it appears in the list.
2. Click **Add** with an empty title: a message appears and no request is sent.
3. Change a task's status: the badge changes and the change survives a page refresh.
4. Click **Delete**: the task disappears and stays gone after a refresh.
5. Change the accent colour from the theme dropdown.
6. Locally, persistence check: run `docker restart dynamodb-local`, wait a few seconds, and refresh. Your tasks should still be there.

### Checking the cloud resources

In the AWS console (region **Asia Pacific (Mumbai) `ap-south-1`**):

| Service | What to look at |
|---|---|
| CloudFormation | Stack `todo-api`: Resources, Events and Outputs |
| Lambda | The four functions, their code and environment variables |
| API Gateway | The `/tasks` and `/tasks/{id}` resources and the `Prod` stage |
| DynamoDB | `TasksTable` > Explore table items |
| CloudWatch | Log groups named `/aws/lambda/<function-name>` for each request |

## Troubleshooting

| Problem | Cause and fix |
|---|---|
| A request hangs for 10 seconds, then returns 502 | `dynamodb-local` is not running. Check `docker ps` and run `docker start dynamodb-local`. |
| `ResourceNotFoundException: Cannot do operations on a non-existent table` | The table is missing, or DynamoDB Local was running in memory mode. Recreate the table (local setup step 4) and make sure the container uses a volume. |
| `Missing Authentication Token` | You called a path that is not declared in `template.yaml`. Use `/tasks`. |
| Browser shows a CORS error locally | Check that the allowed origin matches the frontend address and that `AllowHeaders` contains `Content-Type` (with a hyphen, not an underscore), then rebuild and restart `start-api`. |
| Frontend shows "Failed to fetch" against the cloud API | The Lambda responses are missing `Access-Control-Allow-Origin`, or `FrontendOrigin` does not exactly match the frontend address (`https://`, no trailing slash). Check with the `curl.exe -i -H "Origin: ..."` command above, fix, then `sam build` and `sam deploy`. |
| `sam build` fails with `WinError 32` | The running `start-api` containers lock the build folder. Stop `start-api` first. |
| `start-api` fails with a registry timeout | Add `--skip-pull-image` to use the local image. |
| `unable to open database file` in the DynamoDB logs | The volume is owned by root. Recreate the container with `-u root` (local setup step 3). |
| Code changes have no effect | Re-run `sam build` (and restart `start-api`, or run `sam deploy` for the cloud) after changing anything in `src/` or `template.yaml`. |
| Update returns 404 for a task you can see | The id was copied incorrectly. Copy the whole id from the list response. |
| `sam deploy` rejects `samconfig.toml` or the origin looks wrong | Each inner quote in `parameter_overrides` must be written as `\"`. A missing quote (for example `\https://...`) breaks the value. |
| Vercel site cannot reach the API after changing `VITE_API_URL` | Vite bakes the variable in at build time. Redeploy the frontend after changing it, and do not add a trailing slash. |
| Empty page or build error on Vercel | Check that **Root Directory** is `frontend`. |
| Everything looks empty in the AWS console | Switch the region to `ap-south-1`. |

## Design notes

- One Lambda per operation keeps each function small and easy to debug.
- Validation exists on both sides: the frontend gives quick feedback, and the API is the real protection.
- `PUT` uses a `ConditionExpression` so updating an unknown id returns `404` instead of silently creating an item.
- `status` is a DynamoDB reserved word, so the update uses `ExpressionAttributeNames`.
- The table name and the DynamoDB endpoint come from environment variables, so the same code runs locally and in the cloud.
- Each function has an IAM policy limited to the table it uses.
- The allowed CORS origin is a template parameter, so it can be changed per environment without editing code.

## Limitations

- There is no authentication. All users share one task list, and anyone with the API URL can read, change or delete any task.
- The API allows a single frontend origin at a time.

## Possible improvements

- Authentication with Amazon Cognito, storing a `userId` on each task and querying by it instead of scanning the whole table
- Edit task titles from the UI
- Automated tests for the handlers
- A CI/CD pipeline that runs `sam build` and `sam deploy` on every push
- Rate limiting and an API key or usage plan on API Gateway
- A custom domain for the API and frontend
