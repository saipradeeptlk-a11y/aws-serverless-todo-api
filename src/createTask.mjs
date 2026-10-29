import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {PutCommand,DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb";
import {randomUUID} from "node:crypto";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
};

const client = new DynamoDBClient({endpoint: process.env.DYNAMODB_ENDPOINT || undefined});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    const validStatus = ["completed","pending","not_started"];

    // 1. who is calling? (401 if we can't tell)
    const userId = event?.requestContext?.authorizer?.claims?.sub;
    if(!userId){
        return {
            statusCode: 401,
            headers: headers,
            body: JSON.stringify({ message: "The user id is missing" })
        };
    }

    // 2. read the body
    let d;
    try{
        d = JSON.parse(event.body);
    }catch(err){
        console.log(err);
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ message: "Invalid JSON in request body" })
        };
    }

    // 3. validate the data
    if(!d || typeof d.title !== "string" || !d.title.trim() || !d.status){
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ message: "title and status are required" })
        };
    }
    if(!validStatus.includes(d.status)){
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ message: "The status is invalid" })
        };
    }

    // 4. build the task: userId comes from the token, never from the body
    const task = {
        id: randomUUID(),
        title: d.title.trim(),
        status: d.status,
        createdAt: new Date().toISOString(),
        userId: userId
    };

    try{
        await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: task
        }));
        return {
            statusCode: 201,
            headers: headers,
            body: JSON.stringify(task)
        };
    }catch(err){
        console.log(err);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ message: "Could not save the task" })
        };
    }
};