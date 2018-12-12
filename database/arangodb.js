import Database from 'arangojs';

const db = new Database(`http://${process.env.DB_HOST}:${process.env.DB_PORT}`);
db.useDatabase(process.env.DB_NAME);
db.useBasicAuth(process.env.DB_USER, process.env.DB_PASS);

export default db;