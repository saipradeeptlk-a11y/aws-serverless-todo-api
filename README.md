# Serverless To-Do App with Login

A to-do app where every user has their own private task list. The backend is fully serverless on AWS (API Gateway, Lambda, DynamoDB, Cognito) and the frontend is a React app hosted on Vercel.

**Live demo:** https://aws-serverless-todo-api-phi.vercel.app

## Features

- Sign up with email and password, confirmed with a 6-digit code sent by email
- Sign in, sign out, and stay signed in across page reloads
- Forgot password: request a code by email, then set a new one
- Create, update (status) and delete tasks
- Each user only sees and changes their own tasks
- Choose a colour theme

## Architecture

```
React (Vite) on Vercel
        |  HTTPS, ID token in the Authorization header
        v
API Gateway (REST) -- Cognito authorizer checks the token
        |
        v
Lambda (Node.js 22): createTask, getTasks, updateTask, deleteTask
        |
        v
DynamoDB: TasksTableAuth (index: UserIdIndex)
```

| Service | Why it is used |
|---|---|
| Cognito user pool | Stores users, handles sign-up, email confirmation, sign-in and password reset |
| API Gateway | Public HTTPS entry point; rejects requests without a valid token before any code runs |
| Lambda | Runs the four task handlers only when a request arrives |
| DynamoDB | Stores tasks; the `UserIdIndex` index lets a user's tasks be queried by `userId` |
| SAM / CloudFormation | Defines all of the above in `template.yaml` so it can be deployed repeatably |
| Vercel | Builds and hosts the React frontend |

Region: `ap-south-1`.

## How login works

1. The user signs in on the frontend. The `amazon-cognito-identity-js` library talks to Cognito and receives an **ID token**.
2. The library keeps the session in the browser's local storage, so the user stays signed in until they sign out.
3. Every API request goes through one helper (`authFetch`), which attaches the ID token in the `Authorization` header. The raw token is sent, with no `Bearer ` prefix.
4. API Gateway's Cognito authorizer verifies the token. A missing or invalid token gets a `401` and the Lambda never runs.
5. The Lambda reads the user's ID (`sub`) from the verified token. **The user ID never comes from the request body**, so a user cannot act as someone else.
6. Updates and deletes include a condition that the task's `userId` matches the caller. Someone else's task returns `404`.

## API

All routes require a valid ID token.

| Method | Path | What it does |
|---|---|---|
| GET | `/tasks` | List the caller's tasks |
| POST | `/tasks` | Create a task (`title`, `status`) |
| PUT | `/tasks/{id}` | Update a task's status |
| DELETE | `/tasks/{id}` | Delete a task |

Valid statuses: `not_started`, `pending`, `completed`.
Errors: `401` no or invalid token, `400` invalid input, `404` task not found or not owned by the caller.

## Project structure

```
.
├── template.yaml        # SAM template: API, Lambdas, table, Cognito
├── samconfig.toml       # Deploy settings (use the "auth" environment)
├── src/                 # Lambda handlers (.mjs)
├── events/              # Sample events for local testing with sam local invoke
├── gsi.json             # Index definition for the local DynamoDB table
└── frontend/
    └── src/
        ├── auth/cognito.js         # Cognito sign-up, sign-in, reset, sign-out
        ├── api/tasksApi.js         # API calls, including authFetch
        └── components/             # SignInPage, CodeInput, TaskForm, ...
```

## Run the frontend locally

Requirements: Node.js and npm.

1. Deploy the backend first (see below) and note the stack outputs: `ApiUrl`, `UserPoolId`, `UserPoolClientId`.
2. In `frontend/`, create a file named `.env.local`:
   ```
   VITE_API_URL=https://<api-id>.execute-api.ap-south-1.amazonaws.com/Prod
   VITE_USER_POOL_ID=<user-pool-id>
   VITE_USER_POOL_CLIENT_ID=<app-client-id>
   ```
   Leave off the trailing slash on the API URL.
3. Install and start:
   ```
   npm install
   npm run dev
   ```

The API allows requests from **one** origin only (the `FrontendOrigin` parameter). To develop on `http://localhost:5173`, set `FrontendOrigin` to that and redeploy, then set it back for production.

## Deploy the backend

Requirements: AWS CLI (configured), AWS SAM CLI.

```
sam build
sam deploy --config-env auth
```

Before answering `y` to the changeset prompt, check two things:

- The `Parameter overrides` line shows `TableName` as `TasksTableAuth`.
- The `Replacement` column is `False` for the table, the user pool and the app client. `True` would mean data or users would be destroyed.

After a deploy that changes the API, publish the stage so the change goes live:

```
aws apigateway create-deployment --rest-api-id <api-id> --stage-name Prod --region ap-south-1
```

## Deploy the frontend

The frontend is deployed on Vercel from the `main` branch with the root directory set to `frontend`. Add these as environment variables in the Vercel project, then redeploy (they are read at build time):

| Name | Value |
|---|---|
| `VITE_API_URL` | The API URL from the stack outputs |
| `VITE_USER_POOL_ID` | The user pool ID from the stack outputs |
| `VITE_USER_POOL_CLIENT_ID` | The app client ID from the stack outputs |

These are public identifiers, not secrets, and they end up in the browser bundle. Never put a real secret in a `VITE_` variable.

## Known limitations

- The API accepts one allowed origin at a time.
- If a session expires while the task page is open, an error shows instead of returning to the sign-in screen.
- Cognito's built-in email sender has a low daily limit, which is fine for a small project but not for many users.
- `ALLOW_USER_PASSWORD_AUTH` is still enabled on the app client for command-line testing and should be removed before real use.
- Cross-user update and delete protection was tested locally with sample events, but not yet end to end against the live API.