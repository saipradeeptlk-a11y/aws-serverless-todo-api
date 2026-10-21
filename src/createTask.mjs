import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {PutCommand,DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb";
import {randomUUID} from "node:crypto";

const client = new DynamoDBClient({endpoint: process.env.DYNAMODB_ENDPOINT || undefined});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    const validStatus = ["completed","pending","not_started"];

    let d;   

    try{
        d = JSON.parse(event.body);   

        if(!d || !d.title || !d.status){
            const response = {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: 'Some of the data is missing in the request'
                })
            };
            return response;
        }
        if(!(validStatus.includes(d.status))){
            const response = {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: 'The status is invalid'
                })
            };
            return response;
        }
    }catch(err){
        console.log(err);
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Invalid JSON in request body"
            })
        };
    }

    const task = {
        id: randomUUID(),
        title: d.title,
        status: d.status,
        createdAt: new Date().toISOString()
    };

    try{
        await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME,
            Item: task
        }));
        const response = {
            statusCode: 201,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task)
        };
        return response;
    }catch(err){
        console.log(err);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Could not save the task"
            })
        };
    }
};