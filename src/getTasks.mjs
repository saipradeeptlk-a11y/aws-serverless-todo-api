import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
};

const client = new DynamoDBClient({endpoint: process.env.DYNAMODB_ENDPOINT || undefined});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    const userId = event?.requestContext?.authorizer?.claims?.sub;
    if(!userId){
        return {
            statusCode: 401,
            headers: headers,
            body: JSON.stringify({ message: "The user id is missing" })
        };
    }

    try{
        const data = await docClient.send(new QueryCommand({
            TableName: process.env.TABLE_NAME,
            IndexName: "UserIdIndex",
            KeyConditionExpression: "userId = :uid",
            ExpressionAttributeValues: {
                ":uid": userId
            }
        }));

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify(data.Items)
        };
    }catch(err){
        console.log(err);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ message: "Could not get the items from the table" })
        };
    }
};