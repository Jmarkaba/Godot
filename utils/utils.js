/*
 * Universal functions
*/
function titleCase(str) {
    return str
    .toLowerCase()
    .split(' ')
    .map(word => word.replace(word[0], word[0].toUpperCase()))
    .join(' ');
}
function parseCustom(args, custom = '--') {
    // recreate the string to parse with custom instead
    let s = args.join(" ");
    let _data = s.split(custom).map((str) => str.trim());
    _data.shift();
    return _data;
}
// For permission checks
function isAuthorized(message) {
    const AUTHORIZED = ['Director'];
    for(let i = arguments.length-1; i > 0; --i) {
        AUTHORIZED.push(arguments[i]);
    }
    if(message.member.roles.some(r => AUTHORIZED.includes(r.name)))
        return true;
    else {
        message.channel.send("You do not have permission to use that command.");
        return false;
    }
}
function announce(place, channelName, toAnnounce) {
    // place can be message object or guild directly
    // allows for more flexibility
    let guild = place.guild || place; 
    let announcement = guild.channels.find(el => el.name === channelName);
    // sends the announceString if a model is provided or if a string just the string directly
    if(announcement) announcement.send(toAnnounce.announceString || toAnnounce);
}

// Exports
module.exports.titleCase = titleCase;
module.exports.parseCustom = parseCustom;
module.exports.isAuthorized = isAuthorized;
module.exports.announce = announce;