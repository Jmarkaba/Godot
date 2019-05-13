const mongoose = require("mongoose");

const meetingSchema = mongoose.Schema({
    start: Date,
    end: Date,
    duration: String,
    location: String,
    password: String
});
class MeetingClass {
    get nextString() {
        return ["There will be a meeting on",this.start.toString('dddd, MMM dS'),"at",this.start.toString('t')+".",
        "The meeting will take place at", this.location+".", "It will be",this.duration,
        "hours long. Try not to be late!"].join(" ");
    }
    get briefString() {
        return ["On", this.start.toString('MMMM dS, yyyy'), "at", this.location].join(" ");
    }
}
meetingSchema.loadClass(MeetingClass);

// Exports
module.exports = mongoose.model('Meeting', meetingSchema);