// Imports
// Model functions
var Resource = require('../schemas/resource.js');
// Misc
const utils = require('../utils/utils.js');

// @REIMPLEMENT
function handleResource(args, message) {
    let command = args.shift();
    switch(command) {
        case 'add':

            // expecting _data to be length 4 and of the form
            // [group] [id] [description] [link]
            let _data = utils.parseDashes(args);
            if(_data.length === 4) {
                let resource = {
                    "group": _data[0].toLowerCase(),
                    "id": _data[1].toLowerCase(),
                    "description": _data[2],
                    "link": _data[3]
                };
                console.log(resource);
                //Resource.create(resource, err => {if(err) console.log(err);});
                message.channel.send("Resource successfully added.")
            } else message.channel.send((_data.length < 4 ? "Too few" : "Too many") + " arguments provided for resource.");
            break;
        case 'remove':
            let del_id = args.join(" ").toLowerCase();
            Resource.remove({id: del_id}, err => {if(err) console.log(err);});
            message.channel.send('Removed resource named "' + del_id + '" if one existed');
            break;
        case 'fetch':
            let fet_id = args.join(" ").toLowerCase();
            let resource = fetchResource(fet_id);
            if(resource) message.channel.send(resourceToString(resource));
            else message.channel.send('Could not find resource: "' + fet_id + '"')
            break;
        case 'list':
            let groupid = args.join(" ").toLowerCase();;
            if(info.resources.find(res => res.group === groupid)) {
                let embed = fetchResourceGroupEmbed(groupid);
                message.channel.send({embed});
            } else message.channel.send("No group provided or no such group exists.");
        default:
            break;
    }
}
function fetchResourceGroupEmbed(group) {
    var embed = new Discord.RichEmbed()
        .setTitle("Resource group: " + group)
        .setAuthor(bot.user.username, bot.user.avatarURL)
        .setTimestamp()
        .setColor(FF8C00);
    info.resources.forEach(res => {
        if(res.group === group)
            embed.addField(res.id, res.fullResource);
    });
    return embed;
}

// Exports
module.exports.handler = handleResource;