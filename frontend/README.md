# AWS Serverless To-Do API

A full-stack to-do application built with a serverless REST API (AWS SAM, Lambda, API Gateway, DynamoDB) and a React frontend. The API runs locally with `sam local start-api` against DynamoDB Local.

## Features

- Create, read, update and delete tasks (full CRUD)
- Three task statuses: `not_started`, `pending`, `completed`
- Input validation on both the frontend and the API
- Data persists in DynamoDB Local between restarts
- React frontend with a light design and selectable accent colour

## Architecture

```
React (Vite)  ->  API Gateway  ->  Lambda (Node.js 22)  ->  DynamoDB
localhost:5173    127.0.0.1:3000   one function per route    TasksTable
```

Locally, `sam local start-api` emulates API Gateway and runs each Lambda in a Docker container. The containers reach DynamoDB Local over a shared Docker network.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite |
| API | AWS SAM, API Gateway, AWS Lambda (Node.js 22) |
| Database | DynamoDB (DynamoDB Local for development) |
| SDK | AWS SDK v3 (`@aws-sdk/lib-dynamodb`) |
| Tooling | Docker, AWS CLI, SAM CLI |

## Project structure

```
.
├── template.yaml        # SAM template: functions, routes, CORS
├── samconfig.toml
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
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

The commands below are for PowerShell on Windows.

## Setup

### 1. Clone the repository

```powershell
git clone https://github.com/<your-username>/aws-serverless-todo-api.git
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
sam local start-api --docker-network sam-local --skip-pull-image
```

The API is now at `http://127.0.0.1:3000`. Leave this terminal open.

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

> The API only allows the origin set in `template.yaml` under `Globals > Api > Cors > AllowOrigin` (`http://localhost:5173`). If Vite uses a different port, update it and restart the API.

## API reference

Base URL: `http://127.0.0.1:3000`

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
3. Click **Update** on a task, choose a new status: the badge changes and the change survives a page refresh.
4. Click **Delete**: the task disappears and stays gone after a refresh.
5. Change the accent colour from the dropdown.
6. Persistence: run `docker restart dynamodb-local`, wait a few seconds, and refresh. Your tasks should still be there.

## Troubleshooting

| Problem | Cause and fix |
|---|---|
| A request hangs for 10 seconds, then returns 502 | `dynamodb-local` is not running. Check `docker ps` and run `docker start dynamodb-local`. |
| `ResourceNotFoundException: Cannot do operations on a non-existent table` | The table is missing. Recreate it (setup step 4). |
| `Missing Authentication Token` | You called a path that is not declared in `template.yaml`. Use `/tasks`. |
| Browser shows a CORS error | Check that `AllowOrigin` matches the frontend address, that `AllowHeaders` contains `Content-Type` (with a hyphen, not an underscore), then rebuild and restart `start-api`. |
| `sam build` fails with `WinError 32` | The running `start-api` containers lock the build folder. Stop `start-api` first. |
| `start-api` fails with a registry timeout | Add `--skip-pull-image` to use the local image. |
| `unable to open database file` in the DynamoDB logs | The volume is owned by root. Recreate the container with `-u root` (setup step 3). |
| Code changes have no effect | Re-run `sam build` (and restart `start-api`) after changing anything in `src/` or `template.yaml`. |
| Update returns 404 for a task you can see | The id was copied incorrectly. Copy the whole id from the list response. |

## Design notes

- One Lambda per operation keeps each function small and easy to debug.
- Validation exists on both sides: the frontend gives quick feedback, and the API is the real protection.
- `PUT` uses a `ConditionExpression` so updating an unknown id returns `404` instead of silently creating an item.
- `status` is a DynamoDB reserved word, so the update uses `ExpressionAttributeNames`.
- The API has no authentication. It is intended for local development.

## Possible improvements

- Edit task titles from the UI
- Authentication
- Deploying to AWS (add the table to `template.yaml`, grant the functions IAM access, run `sam deploy`)
- Automated tests for the handlers
