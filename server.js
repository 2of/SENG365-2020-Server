require('dotenv').config();
const db = require('./config/db');
const express = require('./config/express');

const app = express();
const port = process.env.PORT || 4941;
// use 4941

function is_email(str_in) { 
    console.log("EMAIL CHECK NOT IMPLENTED :: DEFAULT TO ALWAYS VALID");
    return true;
}

// Test connection to MySQL on start-up
async function testDbConnection() {
    try {
        await db.createPool();
        await db.getPool().getConnection();
    } catch (err) {
        console.error(`Unable to connect to MySQL: ${err.message}`);
        process.exit(1);
    }
}

testDbConnection()
    .then(function() {
        app.listen(port, function() {
            console.log(`Listening on port: ${port}`);
        });
    });