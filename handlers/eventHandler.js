// Imports
// Datetime configuration and scheduling
const { RichEmbed } = require('discord.js');
const $D = require('../utils/date');
Date = $D.Date;
const schedule = require('node-schedule');

// Model functions
const Guild = require('../schemas/guild');
const Event = require('../schemas/event'); 
const utils = require('../utils/utils');

async function handleEvent(args, message) {
    utils.checkCount(message, args, 1, 'No command specified for category "event".');
    let command = args.shift();
    let _data;
    switch (command) {
        case 'pending':
            message.channel.send(`There are ${Object.keys(schedule.scheduledJobs).length} events pending.`).catch(O_o => {});
            break;

        // Adding a new event
        case 'add':
            // Permission check
            if( !await utils.isAuthorized(message) ) break;
            args.unshift('--name');
            if(utils.checkFlagCount(message, args, 2, 'Too few arguments or invalid format for command "event add".'))
                break;

            _data = utils.parseFlags(args, {'notify': '0', 'desc': ''});
            let ev = {
                'name': _data['name'],
                'date': $D.parse(_data['date']),
                'desc': _data['desc'] ,
                'guild': message.guild.id,
                'notifyAll': !!parseInt(_data['notify']),
                'notify': []
            };
            Event.create(ev, (err, event) => {
                console.log('==============================EVENT:ADD==============================');
                if(!err) {
                    const announcement = event.notifyAll 
                    ? `@everyone ${event.nextString}`
                    : `@everyone ${event.nextString} React 👍 if you like to be notified when it happens.`;
                    utils.announce(message.guild, announcement).then((msg) => {
                        if(msg && !event.notifyAll) {
                            msg.react('👍');
                            const collector = msg.createReactionCollector((r, _) => r.emoji.name === '👍');
                            collector.on('collect', (reaction, _) => {
                                event.notify = reaction.users.map(u => u.id);
                                event.save();
                            });
                        }
                        if(msg) {
                            // schedule function for the date of the event
                            schedule.scheduleJob(event.id, event.date, () => startEventJob(event, message.guild));
                            console.log('Created event: ' + event);
                        }
                    });
                } else {
                    console.log('Failed to create event: ' + event);
                    console.log('Error: ' + err);
                }
            });
            break;

        case 'cancel':
            args.unshift('--name');
            if(utils.checkFlagCount(message, args, 1, 'Too few arguments or invalid format for command "event cancel".'))
                break;

            _data = utils.parseFlags(args, {'count': -1});
            _data['count'] = parseInt(_data['count'])
            _performOnSortedEvents({name: _data['name']}, (docs) => {
                let tot = docs.length;
                if(_data['count'] < 0) {
                    docs.forEach(doc => doc.remove())
                } else {
                    tot = Math.min(tot, _data['count']);
                    let i = 0;
                    while(i < tot) {
                        docs[i].remove();
                    }
                }
                message.channel.send(`Removed ${tot} events named ${_data['name']} from the schedule.`)
            });
            break;

        case 'upcoming':
            _performOnSortedEvents({}, (docs) => {
                const embed = new RichEmbed({
                    title: 'Upcoming Events:',
                    color: 0xfd5e53
                });
                docs = docs.length < 10 ? docs : docs.splice(0, 10);
                embed.setDescription(docs.length ?
                    docs.map((d, idx) => `${idx+1}. ${d.shortString}`).join('\n')
                    : 'There are no upcoming events scheduled.');
                message.reply(embed);
            });
            break;

        case 'help':
            const embed = new RichEmbed({
                title: 'Event Commands:',
                color: 0xfd5e53,
                description: '**event:add [name] --date [datetime] (--notify [0/1]) (--desc [description])**\
                \n> Add a new event on [datetime]. Notify everyone (1) or only reactors (0).\
                \n**event:cancel [name] (--count [integer > 0])**\
                \n> Cancel the next count number of event(s) with name [name]. Defaults to all of them.\
                \n**event:upcoming**\
                \n> Display up to the next 10 upcoming events.\
                \n**event:pending**\
                \n> Display the number of pending events.\
                \n**event:help**\
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
function _performOnSortedEvents(eventFilter, func) {
    Event.find(eventFilter).sort({date: 1}).exec((err,docs) => {
        if(err) {
            console.log(`Perform on sorted events error: ${err}`);
        } else {
            func(docs);
        }
    });
}
function startEventJob(event, g) {
    Guild.findById(g.id).then((guild) => {
        console.log(event);
        const channels = g.channels.filter(c => c.type == 'text');
        channel = channels.find(c => c.id === guild.channel) || channels.first();
        if(event.notifyAll) {
            channel.send(`@everyone ${event.warningString}`);
        } else {
            console.log(event.notify);
            mentions = event.notify ? event.notify.map((id, _) => `<@${id}>`).join(' ') : '';
            channel.send(`${mentions} ${event.warningString}`);
        }
        event.remove();
    }).catch(err => console.log(`Start job failed because ${err.stack}`));
}

// Exports
module.exports.handler = handleEvent;
module.exports.startEventJob = startEventJob;