const mongoose = require('mongoose');
const guildSchema = mongoose.Schema({
    _id: String,
    channelID: String,
    permissionsRole: String,
});
class GuildClass {}
guildSchema.loadClass(GuildClass);

// Exports
module.exports = mongoose.model('Guild', guildSchema);