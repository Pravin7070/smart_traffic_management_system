const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB || 'smart_traffic_management_system';

let mongoDb = null;
let mongoReady = false;
let mongoClient = null;

const connectDatabase = async () => {
    try {
        mongoClient = new MongoClient(mongoUri);
        await mongoClient.connect();
        mongoDb = mongoClient.db(mongoDbName);
        mongoReady = true;
        console.log(`✓ MongoDB connected at ${mongoUri} using database ${mongoDbName}`);
        return mongoDb;
    } catch (error) {
        mongoReady = false;
        console.warn(`⚠ MongoDB unavailable: ${error.message}`);
        return null;
    }
};

const getDatabase = () => mongoDb;
const isConnected = () => mongoReady;

const collection = (name) => {
    return mongoDb ? mongoDb.collection(name) : null;
};

const closeDatabase = async () => {
    if (mongoClient) {
        await mongoClient.close();
        mongoDb = null;
        mongoReady = false;
        console.log('✓ MongoDB connection closed');
    }
};

module.exports = {
    connectDatabase,
    getDatabase,
    isConnected,
    collection,
    closeDatabase
};



























