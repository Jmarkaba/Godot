const Guild = require('../schemas/guild.js'); 

// Parsing functions
function parseFlags(args, def) {
    // recreate the string to parse for flags
    let s = args.join(' ');
    let arr = s.split(/--(\w+)/).filter(el => el);
    let i = 0;
    let _data = def;
    while(i < arr.length && arr.length % 2 === 0) {
        _data[arr[i++]] = arr[i++].trim();
    }
    return _data;
}
function parseMention(string) {
    res = string.match(/<[#@](\d+)>/);
    return res ? res[1] : null;
}

// Format and permission checks
function checkCount(message, args, c, error) {
    if(c && !args || args.length < c) {
        message.reply(error);
        return false;
    } else return true;
}
function checkFlagCount(message, args, c, error) {
    let s = args.join(' ');
    let arr = s.split(/--(\w+)/).filter(el => el);
    return checkCount(message, arr, 2*c, error);
}
async function isAuthorized(message) {
    let authorized = false;
    await Guild.findById(message.guild.id).then((_, guild) => {
        if(message.guild.owner.id === message.member.id
            || message.member.roles.some(r => r.id == guild.permissionsRole)) {
            console.log("Authorized.")
            authorized = true;
        } else {
            console.log("Not authorized.")
            message.channel.send('You do not have permission to use that command.');
            authorized = false;
        }
    });
    console.log(`Authorization: ${authorized}`);
    return authorized;
}

// Output helpers
function announce(guild, announcement) {
    return Guild.findById(guild.id).then(g => {
        const channels = guild.channels.filter(c => c.type == 'text');
        if(g && channels) {
            let channel = g.channelID ? channels.find(c => c.id === g.channelID) : channels.first();
            return channel.send(announcement);
        } else return Promise(null);
    });
}

// Exports
module.exports.parseFlags = parseFlags;
module.exports.parseMention = parseMention;
module.exports.checkCount = checkCount;
module.exports.checkFlagCount = checkFlagCount;
module.exports.isAuthorized = isAuthorized;
module.exports.announce = announce;