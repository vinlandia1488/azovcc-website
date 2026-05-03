import { createClient } from "@base44/sdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const envPath = path.join(process.cwd(), "bot", ".env");
dotenv.config({ path: envPath });

// or use the auth api key
const apiKey = "bk_9567c9c05e3240fb98dfbf4984f8846c"; // Wait, I don't know the api key. I should read it from api/auth.js or .env.
