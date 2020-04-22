// Model functions
const Guild = require('../schemas/guild');
const utils = require('../utils/utils');

async function handleGuildSettings(args, message) {
    utils.checkCount(message, args, 1, 'No command specified for category "setting".');
    let command = args.shift();
    switch (command) {
        case 'set-output-channel':
            utils.checkCount(message, args, 1, 'No argument provided for command "setting set-output-channel".');
            const channel = utils.parseMention(args.shift());
            Guild.findByIdAndUpdate(message.guild.id, { channelID: channel }, 
                { useFindAndModify: false }).catch(err => console.log(`Could not update guild (${message.guild.id}) channel because ${err}`));
            break;

        case 'set-permissions-role':
            utils.checkCount(message, args, 1, 'No argument provided for command "setting set-permissions-role".');
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