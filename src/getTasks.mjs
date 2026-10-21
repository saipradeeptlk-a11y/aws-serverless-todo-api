import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN,
};
const client = new DynamoDBClient({endpoint: process.env.DYNAMODB_ENDPOINT || undefined})
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async () =>{
    try{
       const data = await docClient.send(new ScanCommand({
           TableName: process.env.TABLE_NAME
       }))

       const response = {
           statusCode:200,
           headers: headers,
           body: JSON.stringify(data.Items)

       }
       return response;
    }catch(err){
        console.log(err);
        return{
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                message: "Could not get the items from the table"
            })
        }
    }   
}