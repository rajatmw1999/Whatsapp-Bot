const express = require('express');
const app = express();
const fs = require('fs');
const mysql = require('mysql');
var request = require('request');
const bodyParser = require("body-parser");
const http = require('http');

// setting bodyParser settings to handle json data in body 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*"); //'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
        return res.status(200).json({});
    }
    next();
});

//function to read the config file, store in global var and connect to database
var obj, con;
const connectToDB = async() => {
    // read config file 
    obj = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    //configuration to the mysql database
    con = mysql.createConnection({
        host: obj.dbHost,
        user: obj.dbUser,
        password: obj.dbPassword
    });

    // connect to the mysql database
    con.connect(function (err) {
        if (err) throw err;
        console.log("Connected to the MySQL Database!");
    });
}


// function to run the raw query of sql 
async function runRawQuery(sql) {
    return new Promise((res, rej) => {
        con.query(sql, async (err, result, fields) => {
            if (err) {
                rej(err);
            }
            return res(result);
        });
    });
}

//dummy route
app.get('/', async (req, res) => {
    return res.send("Hello");
});

// route to send the message to whatsapp and store in database
app.post('/send', async (req, res) => {
    try {
        var { name, phone, gender } = req.body;
        console.log(name, phone)

        const filename = await createMeme(name, gender);

        var url = `https://${obj.whatsappUrl}/instance${obj.whatsappInstance}/message?token=${obj.whatsappToken}`;
        var data = {
            phone: phone, // Receivers phone
            body: `Hello!\n\nItalians have a little joke, that the world is so hard a man must have two fathers to look after him, and that's why they have godfathers.\n\n${filename}`
        };

        // Send a request
        var response = await request({
            url: url,
            method: "POST",
            json: data,
        });

        storeData(name, phone);
        return res.status(200).send({"message":"Your message is sent :)"});
    }
    catch (err) {
        console.log(err);
        return res.status(500).send("Some error");
    }
});

const storeData = async(name, phone) => {
    try{
        let query = "SELECT id FROM whatsappBot.users";
        let result = await runRawQuery(query);
        console.log(result.length);
        query = `INSERT INTO whatsappBot.users VALUES(${result.length + 1},'${name}','${phone}')`;
        result = await runRawQuery(query);
        return true;
    }catch (err) {
        return false;
    }
}

const createMeme = async(name, gender) => {
    let memefile = `http://belikebill.ga/billgen-API.php?default=1&name=${name}&sex=${gender}`;
    return memefile;
}

app.listen(process.env.PORT || 9800, function () {
    connectToDB();
    console.log("Server is live");
});