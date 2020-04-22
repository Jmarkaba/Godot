const mongoose = require('mongoose');
const eventSchema = mongoose.Schema({
    name: String,
    guild: String,
    date: Date,
    job: String,
    desc: String,
    notifyAll: Boolean,
    notify: [String]
});
class EventClass {
    get warningString() {
        return `Just an reminder that the *${this.name}* is starting now.`;
    }
    get nextString() {
        return `**${this.name}** will start on ${this.date.toString('dddd, MMM dS')} at ${this.date.toTimeString()}.`;
    }
}
eventSchema.loadClass(EventClass);

// Exports
module.exports = mongoose.model('Event', eventSchema);