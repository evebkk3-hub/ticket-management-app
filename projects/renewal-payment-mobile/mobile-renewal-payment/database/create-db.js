const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const base = __dirname;
const databaseFile = path.join(base, "renewal-payment.db");
const database = new DatabaseSync(databaseFile);

database.exec(fs.readFileSync(path.join(base, "schema.sql"), "utf8"));
database.exec(fs.readFileSync(path.join(base, "seed.sql"), "utf8"));
database.close();

console.log(databaseFile);
