// Imports
// Model functions
var Resource = require('../schemas/resource.js');
// Misc
const Discord = require('discord.js');
const utils = require('../utils/utils.js');

function handleResource(args, message, bot) {
    let command = args.shift();
    switch(command) {

        case 'add':
            if(!utils.isAuthorized(message, 'Project Heads', 'Consultant')) break;
            // expecting _data to be length 4 and of the form
            // [group] [name] [description] [link]
            let _data = utils.parseCustom(args);
            if(_data.length === 4) {
                let resource = {
                    "group": _data[0].toLowerCase(),
                    "name": _data[1].toLowerCase(),
                    "description": _data[2],
                    "link": _data[3]
                };
                Resource.create(resource, (err, doc) => {
                    if(err) message.channel.send("There was an error adding the resource.");
                    else {
                        message.channel.send("Resource successfully added.");
                        utils.announce(message, 'resources', doc);
                    }
                });
            } else message.channel.send((_data.length < 4 ? "Too few" : "Too many") + " arguments provided for resource.");
            break;
        
        case 'update':
            if(!utils.isAuthorized(message, 'Project Heads', 'Consultant')) break;
            break;

        case 'remove':
            if(!utils.isAuthorized(message, 'Consultant')) break;
            let del_id = args.join(" ").toLowerCase();
            Resource.deleteOne({name: del_id}, err => { 
                if(err) message.channel.send('Could not delete resource named "' + del_id + '" or no such resource exists.');
                else message.channel.send('Removed resource: "' + del_id + '".');
            });
            break;

        case 'fetch':
            let fet_id = args.join(" ").toLowerCase();
            Resource.findOne({name: fet_id}, (err,doc) => {
                if(!err && doc) message.channel.send(doc.fullResource);
                else message.channel.send('Could not find resource: "' + fet_id + '"');
            });
            break;

        case 'list':
            let groupid = args.join(" ").toLowerCase();
            if(!groupid || groupid === 'help') {
                Resource.distinct('group', (err, groups) => {
                    message.channel.send(getUniqueGroups(err, groups));
                });
                break;
            }
            Resource.find({group: groupid}, (err, docs) => {
                if(!err && docs.length !== 0) {
                    let embed = fetchResourceGroupEmbed(groupid, docs, bot);
                    message.channel.send({embed});
                } else {
                    Resource.distinct('group', (err, groups) => {
                        message.channel.send("No such group found. " + getUniqueGroups(err, groups));
                    });
                }
            });
            break;

        default:
            message.channel.send('"' + command + '"' + ' is not recognized as a meeting command.');
            break;
    }
}
function getUniqueGroups(err, groups) {
    console.log(groups);
    if(err || groups.length === 0) return "There are no resources currently.";
    else {
        let ret = "Here is a list of all possible groups: `";
        ret += groups.join("`, `") + "`"; 
        return ret;
    }
}
function fetchResourceGroupEmbed(group, docs, bot) {
    var embed = new Discord.RichEmbed()
        .setTitle("Resource group: " + utils.titleCase(group))
        .setAuthor(bot.user.username, bot.user.avatarURL)
        .setTimestamp()
        .setColor(0xFF7AFF);
    docs.forEach(doc => embed.addField(utils.titleCase(doc.name), doc.fullResource));
    return embed;
}

// Exports
module.exports.handler = handleResource;