/**
 * @version: 1.0.3
 * @author: Jah Markabawi
 */
// Requirements for Discord bot
const Discord = require('discord.js');
const schedule = require('node-schedule');

// Command Handlers
const handleGuildSettings = require('./handlers/guildSettingHandler').handler;
const handleEvent = require('./handlers/eventHandler').handler;
const startEventJob = require('./handlers/eventHandler').startEventJob;

const botToken = process.env.TOKEN || require('./auth.json').token;
const botUsername = 'Godot';
const botStatus = 'The absurdity of Estragon and Vladimir';
const botAvatar = 'D:/Files/Downloads/Wesley_Wyndam-Pryce.jpg';
// For MongoDB
// Connection through mongoose is established during bot init process
const MONGDB_URI = process.env.MONGODB_URI || require('./auth.json').mongo;
const mongoose = require('mongoose');
mongoose.connect(MONGDB_URI, {autoIndex: false, useNewUrlParser: true, useUnifiedTopology: true}, (err) => { if(err) console.log(err); });
const Guild = require('./schemas/guild');
const Event = require('./schemas/event');

// Initialize Discord bot
const bot = new Discord.Client();
bot.on('ready', () => {
    console.log('Initializing...');
    if(bot.user.username != botUsername && !process.env.TOKEN) {
        bot.user.setUsername(botUsername);
        bot.user.setActivity(botStatus, { type: 'WATCHING' });
        bot.user.setAvatar(botAvatar);
    }
    bot.setMaxListeners(1000);
    // Reinitialize any existing jobs
    // This is in case of a reboot such as 
    // when Heroku updates the bot
    Event.find({}, (err, docs) => {
        if(!err) {
            const now = Date.now();
            docs.forEach(doc => {
                if(doc.date < now) {
                    doc.remove();
                } else {
                    g = bot.guilds.find(g => g.id === doc.guild);
                    schedule.scheduleJob(doc.id, doc.date, () => startEventJob(doc, g));
                }
            });
        } else {
            console.log(`Could not add all docs: ${err}`);
        }
    });
    console.log('Connected!');
});

bot.on('message', async message => {
    if (message.content.substring(0, 3) === 'B->' && message.content.length > 3) {
        // preprocess args
        let args = message.content.substring(3).split(' ');
        args = args.filter(el => el);
        // args will now act as a stack of the commands and data ouput
        // from the message so we can shift() each command one at a time
        // and then just pass the array (args)
        let command = args.shift() // removes first element in the message
        switch (command) {
            case 'event':
                handleEvent(args, message);
                break;
            case 'setting':
                handleGuildSettings(args, message);
                break;
            case 'help':
                const embed = new Discord.RichEmbed({
                    title: 'Bot Categories:',
                    color: 0xfd5e53,
                    description: 'event\nsetting\nhelp\nType "B->(category) help" to see the list of options for that catergory.'
                });
                message.reply(embed);
                break;
            default:
                message.channel.send(`${command} is not a valid command. Type \`B->help\` to see a full list of commands.`);
                break;
        }
        message.delete(30).catch(O_o => {console.log(`Failed to delete message: ${O_o}`)});
    }
});

bot.on('guildCreate', (guild) => {
    Guild.create({_id: guild.id}, (err) => { if(err) console.log(err); else console.log(`Added new guild: ${guild.id}`) });
});
bot.on('guildDelete', (guild) => {
    Guild.findByIdAndDelete(guild.id, (err) => { if(err) console.log(err); else console.log(`Removed guild: ${guild.id}`) });
    Event.deleteMany({guild: guild.id}, (err) => { if(err) console.log(`Failed to remove events for guild: ${guild.id}`)});
});


// initialize client bot
bot.login(botToken);