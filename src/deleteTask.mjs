import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
};

const Client = new DynamoDBClient({endpoint: process.env.DYNAMODB_ENDPOINT || undefined});
const docClient = DynamoDBDocumentClient.from(Client);

export const handler = async (event) => {
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
    const Itemid = event?.pathParameters?.id;
    if(!Itemid){
        return {
            statusCode: 400,
            headers: headers,
            body: JSON.stringify({ message: "Task ID is required" })
        };
    }

    // 3. delete, only if the task belongs to this user
    try{
        await docClient.send(new DeleteCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
                id: Itemid
            },
            ConditionExpression: "#uid = :uid",
            ExpressionAttributeNames: {
                "#uid": "userId"
            },
            ExpressionAttributeValues: {
                ":uid": userId
            }
        }));

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ message: "successfully deleted the item" })
        };
    }catch(err){
        if(err.name === "ConditionalCheckFailedException"){
            return {
                statusCode: 404,
                headers: headers,
                body: JSON.stringify({ message: "Task not found" })
            };
        }
        console.log(err);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ message: "Could not delete the task" })
        };
    }
};