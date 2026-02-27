// Shared in-memory storage for when MongoDB is not available
const inMemoryRooms = new Map();
const inMemoryMessages = new Map();
const inMemoryJoinRequests = [];

module.exports = { inMemoryRooms, inMemoryMessages, inMemoryJoinRequests };
