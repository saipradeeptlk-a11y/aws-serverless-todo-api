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
    const id = event.pathParameters.id;

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

    try{
        const task = await docClient.send(new UpdateCommand({
            TableName: process.env.TABLE_NAME,
            Key: {
                id: id,
            },
            UpdateExpression: "set #st = :s",
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                ":s": d.status
            },
            ConditionExpression: "attribute_exists(id)",
            ReturnValues: "ALL_NEW",
        }));

        const response = {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify(task.Attributes)
        };
        return response;

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