const readline = require('readline-sync');
const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");

// To start a DynamoDBClient
const client = new DynamoDBClient({
    region: "us-east-2"
});

// Get user input
console.log("Hello! Please log in to access the system:");
const UserName = readline.question("Username: ");
const password = readline.question("Password: ", {hideEchoBack: true});

// Check our DB to see if username and password exist, and if they match.
const params = {
    TableName: "Users",  // Your table name
    Key: {
        UserName: { S: UserName }  
    }
};

async function login() {
    try {
        // 1. Set up the command with the params
        const command = new GetItemCommand(params);

        // 2. Send the client for the information using the command
        const response = await client.send(command);

        // 3. Validate that the information (user) was found
        if (!response.Item) {
            console.log("User not found.");
            return;
        }

        // 4. Validate that the password matches
        if (response.Item.password.S === password) {
            console.log("Login succeeded!");
        } else {
            console.log("Incorrect password.");
        }
    } catch (error) {
        console.error("Error: ", error);
    }
}

login();
