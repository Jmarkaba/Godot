// Model functions
const Guild = require('../schemas/guild');
const utils = require('../utils/utils');

async function handleGuildSettings(args, message) {
    let command = args.shift();
    switch (command) {
        case 'set-output-channel':
            const channel = utils.parseMention(args.shift());
            Guild.findByIdAndUpdate(message.guild.id, { channelID: channel }, 
                { useFindAndModify: false }).catch(err => console.log(`Could not update guild (${message.guild.id}) channel because ${err}`));
            break;

        case 'set-permissions-role':
            const role = utils.parseMention(args.shift());
            Guild.findByIdAndUpdate(message.guild.id, { permissionsRole: role }, 
                { useFindAndModify: false }).catch(err => console.log(`Could not update guild (${message.guild.id}) channel because ${err}`));
            break;
        
        // Invalid commands
        default:
            message.channel.send(`${command} is not recognized as a event command.`);
            break;
    }
}

module.exports.handler = handleGuildSettings;