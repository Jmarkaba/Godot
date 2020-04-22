const { RichEmbed } = require('discord.js');
// Model functions
const Guild = require('../schemas/guild');
const utils = require('../utils/utils');

async function handleGuildSettings(args, message) {
    utils.checkCount(message, args, 1, 'No command specified for category "setting".');
    let command = args.shift();
    let b
    switch (command) {
        case 'set-output-channel':
            if(utils.checkCount(message, args, 1, 'No argument provided for command "setting set-output-channel".'))
                break;
            
            const channel = utils.parseMention(args.shift());
            Guild.findByIdAndUpdate(message.guild.id, { channelID: channel }, 
                { useFindAndModify: false }).catch(err => console.log(`Could not update guild (${message.guild.id}) channel because ${err}`));
            break;

        case 'set-permissions-role':
            if(utils.checkCount(message, args, 1, 'No argument provided for command "setting set-permissions-role".'))
                break;

            const role = utils.parseMention(args.shift());
            Guild.findByIdAndUpdate(message.guild.id, { permissionsRole: role }, 
                { useFindAndModify: false }).catch(err => console.log(`Could not update guild (${message.guild.id}) channel because ${err}`));
            break;

        case 'help':
            const embed = new RichEmbed({
                title: 'Setting Commands:',
                color: 0xfd5e53,
                description: '**setting:set-output-channel #[channel]**\
                \n> Directs all bot announcements to the mentioned [channel].\
                \n**setting:set-permissions-role @[role]**\
                \n> Allows anyone in this server with the mentioned [role] to have elevated bot permissions.\
                \n**setting:help**\
                \n> Display this help menu.\
                \n*Parentheses indicate optional flags/arguments.*'
            });
            message.reply(embed);
            break;
        
        // Invalid commands
        default:
            message.channel.send(`${command} is not recognized as a event command.`);
            break;
    }
}

module.exports.handler = handleGuildSettings;