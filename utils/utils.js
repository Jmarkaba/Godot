/*
 * Universal functions
*/
function parseDashes(args) {
    // recreate the string to parse with dashes instead
    let s = args.join(" ");
    let _data = s.split('-').map((str) => str.trim());
    _data.shift();
    return _data;
}
// For permission checks
function isAuthorized(message) {
    const AUTHORIZED = ['Director', 'Project Heads'];
    if(message.member.roles.some(r => AUTHORIZED.includes(r.name)))
        return true;
    else {
        message.channel.send("You do not have permission to use that command.");
        return false;
    }
}

module.exports.parseDashes = parseDashes;
module.exports.isAuthorized = isAuthorized;