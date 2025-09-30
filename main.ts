import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Fetch environment variables
const keyName = process.env.KEY_NAME!;
const keySecret = process.env.KEY_SECRET!;
const requestMethod = process.env.REQUEST_METHOD!;
const requestHost = process.env.REQUEST_HOST!;
const requestPath = process.env.REQUEST_PATH!;
const algorithm = 'HS256'; // Not an environment variable

// Construct the URI
const uri = `${requestMethod} ${requestHost}${requestPath}`;

const generateJWT = (): string => {
    const payload = {
        iss: 'cdp',
        nbf: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 120, // JWT expires in 120 seconds
        sub: keyName,
        uri,
    };

    const header = {
        alg: algorithm,
        kid: keyName,
        nonce: crypto.randomBytes(16).toString('hex'),
    };

    // Use the key directly for HMAC-SHA256
    return jwt.sign(payload, keySecret, { algorithm, header });
};

const main = () => {
    const token = generateJWT();
    console.log("export JWT=" + token);
};

main();
