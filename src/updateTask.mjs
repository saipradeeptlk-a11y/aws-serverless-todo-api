import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
};

const Client = new DynamoDBClient({endpoint: process.env.DYNAMODB_ENDPOINT || undefined});
const docClient = DynamoDBDocumentClient.from(Client);

export const handler = async (event) => {
    const validStatus = ["completed","pending","not_started"];

    // 1. who is calling?
    const userId = event?.requestContext?.authorizer?.claims?.sub;
    if(!userId){
        return {
            statusCode: 401,
            headers: headers,
            body: JSON.stringify({ message: "The user id is missing" })
        };
    }

    // 2. which task?
    const id = event?.pathParameters?.id;
    if(!id){
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ message: "Task ID is required" })
        };
    }

    // 3. read and validate the body
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

    if(!d || !d.status){
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ message: "status is required" })
        };
    }
    if(!validStatus.includes(d.status)){
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ message: "The status is invalid" })
        };
    }

    // 4. update, only if the task belongs to this user
    try{
        const task = await docClient.send(new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
                id: id,
            },
            UpdateExpression: "set #st = :s",
            ExpressionAttributeNames: {
                "#st": "status",
                "#uid": "userId"
            },
            ExpressionAttributeValues: {
                ":s": d.status,
                ":uid": userId
            },
            ConditionExpression: "#uid = :uid",
            ReturnValues: "ALL_NEW",
        }));

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify(task.Attributes)
        };
    }catch(err){
        console.log(err);

        if(err.name === "ConditionalCheckFailedException"){
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({ message: "Task not found" })
            };
        }

        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ message: "Could not update the task" })
        };
    }
};