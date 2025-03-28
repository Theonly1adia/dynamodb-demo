const readline = require('readline-sync');
const { DynamoDBClient, GetItemCommand, ScanCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({
    region: "us-east-2"
});

async function getAllOrders() {
    const command = new ScanCommand({ TableName: "Customer_Orders" });
    const data = await client.send(command);
    return data.Items || [];
}

async function viewTotalSpent(name) {
    const orders = await getAllOrders();
    const ordersByCustomer = orders.filter(order => order.customerName.S === name);
    let total = 0;

    for (const order of ordersByCustomer) {
        const coffee = order.coffeeType.S;
        const quantity = Number(order.quantity.N);
        const price = Number(order.price.N);
        const cost = quantity * price;
        total += cost;

        console.log(`${order.orderId.S}: ${quantity} ${coffee}s. Each is $${price} = ${quantity} * ${price} = $${cost.toFixed(2)}`);
    }

    console.log(`TOTAL THAT ${name.toUpperCase()} HAS SPENT: $${total.toFixed(2)}`);
}

async function viewCoffeeTypes(name) {
    const orders = await getAllOrders();
    const ordersByCustomer = orders.filter(order => order.customerName.S === name);

    const coffeeList = [];
    for (const order of ordersByCustomer) {
        const coffee = order.coffeeType.S;
        if (!coffeeList.includes(coffee)) {
            coffeeList.push(coffee);
        }
    }

    if (coffeeList.length > 0) {
        console.log(`${name}: ${coffeeList.join(', ')}`);
    } else {
        console.log(`${name} has not ordered anything yet.`);
    }
}

async function viewOrderDetails(orderId) {
    const params = {
        TableName: "Customer_Orders",
        Key: {
            orderId: { S: orderId }
        }
    };

    try {
        const command = new GetItemCommand(params);
        const response = await client.send(command);

        if (!response.Item) {
            console.log("Order not found.");
            return;
        }

        console.log("Order Details:");
        console.log(`Order ID: ${response.Item.orderID.S}`);
        console.log(`Customer Name: ${response.Item.customerName.S}`);
        console.log(`Coffee Type: ${response.Item.coffeeType.S}`);
        console.log(`Quantity: ${response.Item.quantity.N}`);
        console.log(`Price per unit: $${response.Item.price.N}`);
    } catch (error) {
        console.error("Error retrieving order details:", error);
    }
}

async function addNewOrder() {
    const customerName = readline.question("What is the customer's name? ");
    const coffeeType = readline.question("Coffee Type? ");
    const quantity = readline.question("How many coffees? ");
    const price = readline.question("Price per unit? ");
    const orderDate = new Date().toISOString().split('T')[0];
    const orderId = `order_${Math.floor(Math.random() * 10000)}`;

    const params = {
        TableName: "Customer_Orders",
        Item: {
            orderId: { S: orderId },
            customerName: { S: customerName },
            coffeeType: { S: coffeeType },
            quantity: { N: quantity },
            price: { N: price },
            orderDate: { S: orderDate }
        }
    };

    try {
        const command = new PutItemCommand(params);
        await client.send(command);
        console.log(`Order ${orderId} for ${customerName} has been successfully placed!`);
    } catch (error) {
        console.log("Failed to add order! ERROR:", error);
    }
}

async function listAllOrders() {
    const orders = await getAllOrders();
    if (!orders.length) {
        console.log("No orders found.");
        return;
    }

    console.log("All Orders:");
    for (const order of orders) {
        console.log(`${order.orderId.S}: ${order.customerName.S}`);
    }
}

async function editOrder(orderId) {
    const params = {
        TableName: "Customer_Orders",
        Key: {
            orderId: { S: orderId }
        }
    };

    try {
        const command = new GetItemCommand(params);
        const response = await client.send(command);

        if (!response.Item) {
            console.log("Order not found.");
            return;
        }

        const currentCoffee = response.Item.coffeeType.S;
        const currentQty = response.Item.quantity.N;
        const currentPrice = response.Item.price.N;

        const newCoffee = readline.question(`New coffee type [${currentCoffee}]: `) || currentCoffee;
        const newQty = readline.question(`New quantity [${currentQty}]: `) || currentQty;
        const newPrice = readline.question(`New price [${currentPrice}]: `) || currentPrice;

        const updateParams = {
            TableName: "Customer_Orders",
            Key: {
                orderId: { S: orderId }
            },
            UpdateExpression: "SET coffeeType = :ct, quantity = :q, price = :p",
            ExpressionAttributeValues: {
                ":ct": { S: newCoffee },
                ":q": { N: newQty.toString() },
                ":p": { N: newPrice.toString() }
            },
            ReturnValues: "UPDATED_NEW",
        };

        const updateCommand = new UpdateItemCommand(updateParams);
        const result = await client.send(updateCommand);
        console.log("Order updated successfully:", result.Attributes);
    } catch (error) {
        console.log("Failed to update order:", error);
    }
}

async function deleteOrder(orderId) {
    const params = {
        TableName: "Customer_Orders",
        Key: {
            orderId: { S: orderId }
        }
    };

    try {
        const command = new DeleteItemCommand(params);
        await client.send(command);
        console.log(`Order ${orderId} has been deleted.`);
    } catch (error) {
        console.log("Failed to delete order", error);
    }
}

async function main() {
    console.log("Welcome to Bayou Beans Coffee Order Lookup!");
    console.log("1. View total spent by customer.");
    console.log("2. View coffee types ordered by customer.");
    console.log("3. Get full order details by Order ID.");
    console.log("4. Add a new order.");
    console.log("5. List all orders.");
    console.log("6. Update an order.");
    console.log("7. Delete an order.");

    const option = readline.question("Choose an option: ");

    switch (option) {
        case "1": {
            const name = readline.question("Enter customer name: ");
            await viewTotalSpent(name);
            break;
        }
        case "2": {
            const name = readline.question("Enter customer name: ");
            await viewCoffeeTypes(name);
            break;
        }
        case "3": {
            const orderId = readline.question("Enter order ID: ");
            await viewOrderDetails(orderId);
            break;
        }
        case "4": {
            await addNewOrder();
            break;
        }
        case "5": {
            await listAllOrders();
            break;
        }
        case "6": {
            const orderId = readline.question("Enter order ID to update: ");
            await editOrder(orderId);
            break;
        }
        case "7": {
            const orderId = readline.question("Enter order ID to delete: ");
            await deleteOrder(orderId);
            break;
        }
        default:
            console.log("Invalid option!");
    }
}

// Run the program
main();
