const mongoose = require("mongoose");

// For reinitializing jobs on bot start up
// Stores the date and name (start datetime as string)
const jobSchema = mongoose.Schema({
    name: String,
    date: Date
});

module.exports = mongoose.model('Job',jobSchema);