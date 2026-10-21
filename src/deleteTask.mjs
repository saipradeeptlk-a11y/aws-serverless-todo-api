import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const Client = new DynamoDBClient({endpoint: process.env.DYNAMODB_ENDPOINT || undefined})
const docClient = DynamoDBDocumentClient.from(Client);

export const handler = async(event)=>{
    try{
       const Itemid = event.pathParameters.id;

       const del = await docClient.send(new DeleteCommand({
        TableName : process.env.TABLE_NAME,
        Key:{
            id : Itemid
        }
       }))

       const response = {
           statusCode:200,
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ message: "successfully deleted the item" })
       }

       return response;
    }catch(err){
        console.log(err)
        const response = {
           statusCode:500,
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ error: "could not delete" })
       }
       return response;
    }   

}