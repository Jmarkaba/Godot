/**
 * @version: 1.0.1
 * @author: Jah Markabawi
 */

// Requirements for Discord bot
const Discord = require('discord.js');
const schedule = require('node-schedule');

// IF YOU ARE NOT USING HEROKU UNCOMMENT THE LINE BELOW
//const auth = require('./auth.json'); 

// Command Handlers
meetingHandle = require('./handlers/meetingHandler').handler;
startMeetingJob = require('./handlers/meetingHandler').startMeetingJob;
resourceHandle = require('./handlers/resourceHandler').handler;

// For MongoDB
// Connection through mongoose is established during bot init process
const MONGDB_URI = process.env.MONGODB_URI || auth.mongo;
const mongoose = require("mongoose");
mongoose.connect(MONGDB_URI, {autoIndex: false, useNewUrlParser: true}, err => { if(err) console.log(err); });
var Job = require('./schemas/job.js');


// Initialize Discord bot
const bot = new Discord.Client();
bot.on('ready', evt => {
    bot.setMaxListeners(30);
    Job.find({}, function (err, docs) {
        if(!err) docs.forEach(doc => {
            schedule.scheduleJob(doc.name, doc.date, () => startMeetingJob(bot.guilds.first()))
        });
    });
    console.log("Connected!");
});
bot.on('message', async message => {
    if (message.content.substring(0, 2) === "//") {
        // preprocess args
        let args = message.content.substring(2).split(' ');
        args = args.filter(el => el !== '');

        // args will now act as a stack of the commands and data ouput
        // from the message so we can shift() each command one at a time
        // and then just pass the array (args)
        let command = args.shift() // removes first element in the message
        
        switch (command) {
            case 'meeting':
                meetingHandle(args, message, bot.guilds.first());
                break;
            case 'resource':
                resourceHandle(args, message);
                break;
            case 'help':
                message.channel.send(helpString());
                break;
            default:
                message.channel.send('"' + command + '"' + ' is not a valid command. Type "//help" to see a full list of commands.');
                break;
        }
    }
});
// initialize client bot
bot.login(process.env.TOKEN || auth.token);



function helpString() {
    let help = 
    '\n```Here is a list of all possible commands:' +
    '\nmeeting [subcommand]' +
    '\n  | add -[time]-[place]-[duration]-[password]' +
    '\n  | next' +
    '\n  | list' +
    '\n  | signin -[password]' +
    '\n  | excuse @Mentionable(s)...' +
    '\n  | cancel' +
    '\nresource [subcommand]' +
    '\n  | add -[group]-[id]-[description]-[link]' +
    '\n  | fetch -[id]' +
    '\n  | list -[group]' +
    '\n  | remove```';
    return help;
}