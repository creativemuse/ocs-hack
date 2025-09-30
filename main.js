"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsonwebtoken_1 = require("jsonwebtoken");
var crypto = require("crypto");
var dotenv = require("dotenv");
var path = require("path");
// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Fetch environment variables
var keyName = process.env.KEY_NAME;
var keySecret = process.env.KEY_SECRET;
var requestMethod = process.env.REQUEST_METHOD;
var requestHost = process.env.REQUEST_HOST;
var requestPath = process.env.REQUEST_PATH;
var algorithm = 'HS256'; // Not an environment variable
// Construct the URI
var uri = "".concat(requestMethod, " ").concat(requestHost).concat(requestPath);
var generateJWT = function () {
    var payload = {
        iss: 'cdp',
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 120, // JWT expires in 120 seconds
        sub: keyName,
        uri: uri,
    };
    var header = {
        alg: algorithm,
        kid: keyName,
        nonce: crypto.randomBytes(16).toString('hex'),
    };
    // Use the key directly for HMAC-SHA256
    return jsonwebtoken_1.default.sign(payload, keySecret, { algorithm: algorithm, header: header });
};
var main = function () {
    var token = generateJWT();
    console.log("export JWT=" + token);
};
main();
