/**
 * @version: 1.0
 * @author: Jah Markabawi
 */
// Constants and globals
const INFO_PATH = './info.json';
var info; // reading and writing in real time
var generalChannel; // references 'general' channel on init
var notHereRole; // references 'Not Here' role on init
var server;

// Requirements for Discord bot
const Discord = require('discord.js');
// if not using heroku uncomment the line below 
// and replace "bot.login(process.env.TOKEN);" with "bot.login(auth.token);""
//const auth = require('./auth.json'); 

// Datetime configuration and scheduling
const $D = require('./date.js');
const schedule = require('node-schedule');

// To keep the bot running on glitch
// uncomment the two lines below if using glitch
//const glitchup = require('glitchup');
//glitchup(); // posts a GET request every ~4 minutes

// For storing the meeting and resource objects
const fs = require('fs');


// Initialize Discord bot
const bot = new Discord.Client();
bot.on('ready', function (evt) {
    bot.setMaxListeners(30);
    console.log(schedule.scheduledJobs);
    // @TODO: Remove hard coding of channel and role names
    generalChannel = bot.channels.find(el => el.name === 'general');
    server = bot.guilds.first();
    notHereRole = server.roles.find(r => r.name === 'Not Here');
    // Load the resource and meeting info
    // @TODO: improve method of fetching resource
    // and meeting (i.e., switch to database)
    info = JSON.parse(fs.readFileSync(INFO_PATH));
    console.log("Connected!");
});
bot.on('message', message => {
    if (message.content.substring(0, 2) === "//") {
        // preprocess args
        let args = message.content.substring(2).split(' ');
        args = args.filter((el) => {
            return el !== '';
        });

        // args will now act as a stack of the commands and data ouputted
        // from the message so we can shift() each command one at a time
        // and then just pass the array (args)
        let command = args.shift() // removes first element in the message
        
        switch (command) {
            case 'test':
                message.channel.send("There are "+ Object.keys(schedule.scheduledJobs).length + " jobs pending.").catch(e => {});
                break;
            case 'meeting':
                handleMeeting(args, message);
                break;
            case 'resource':
                handleResource(args, message);
                break;
            default:
                message.channel.send('"' + command + '"' + ' is not a valid command.');
                break;
        }
    }
    saveInfo(); //to make sure the info is stored correctly
});
// initialize client bot
bot.login(process.env.TOKEN);



/*
 * Meeting related functions

 * Try to mainain the integrity of a meeting object:
    e.g., 
    meeting {
        'start': ...
        'end': ... 
        'location': ...
        'duration': ...
        'password': ... 
    }
    // all properties of a meeting must be kept 
    // as typeof 'string'
*/
function handleMeeting(args, message) {
    let command = args.shift();
    switch (command) {

        // Adding a new meeting
        // Limited by the role
        case 'add':
            message.delete().catch(e => {});
            // checks permissions, breaks if false
            if(!isAuthorized(message)) break;

            // expecting _data to be length 4 and of the form
            // [startTime] [location] [duration: hours] [password]
            let _data = parseDashes(args);
            if(_data.length === 4) {
                // start is a js Date object
                let start = $D.parse(_data[0])
                // check that it was parsed correctly
                if(start) {
                    let meeting = {
                        'start': start.toString('F'),
                        'end': start.add({hours: _data[2]}).toString('F'),
                        'location': _data[1],
                        'duration': _data[2],
                        'password': _data[3]
                    };
                    info.meetings['meeting_list'].push(meeting);
                    info.meetings.meeting_list.sort(compareMeetings);
                    // re-adjust the start value (changed by the add function for meeting.end)
                    start.add({hours: '-'+_data[2]});

                    // schedule function for the date of the meeting
                    // see the startMeetingJob() function below for details
                    // meeting.start is the name of the job so that it can be cancelled
                    // if necessary
                    schedule.scheduleJob(meeting.start, start, () => startMeetingJob());
                    // notify the user
                    message.channel.send("A meeting has been added on " + meeting.start);
                } else message.channel.send('"'+_data[0]+'" could not be recognized as a valid date and time.'); 
            } else {
                let outp = _data.length < 4 ? 'Not enough provided ' : 'Too many ';
                outp += 'arguments for command "' + command + '".'
                message.channel.send(outp);
            }
            break;

        // Signing into a meeting
        case 'signin':
            if(!info.meetings.current) message.channel.send("There is no meeting to sign into.");
            // checks that the password is valid
            if(args.shift() === info.meetings.current) {
                message.delete().catch(e => {});
                let userid = message.author.id;
                let name = removeAbsence(message, userid);
                if(name) message.channel.send(name + " has been signed in.");
                else message.channel.send("Could not sign in " + message.author);
            } else message.channel.send("Incorrect password or no password provided.");
            break;
        
        //Calls the toString of the next meeting
        case 'next':
            let nextM = info.meetings.meeting_list[0];
            if(nextM) message.channel.send(nextMeetingString(nextM));
            else message.channel.send("There is no scheduled meeting coming up.");
            break;
        
        // Same as signin but to excuse someone via mentioning
        // Limited by role
        case 'excuse':
            // checks permissions, breaks if false
            if(!isAuthorized(message)) break;

            message.mentions.users.forEach(user => {
                let name = removeAbsence(message, user.id)
                if(name) message.channel.send(name + " was excused from the current meeting.");
                else message.channel.send("Could not excuse " + user + " from the meeting.");
            });
            break;

        // Remove the next scheduled meeting
        // Limited by role
        case 'cancel':
            // checks permissions, breaks if false
            if(!isAuthorized(message)) break;

            let cancelled = info.meetings['meeting_list'].shift();
            if(cancelled) {
                console.log("Cancelling");
                console.log(schedule.scheduledJobs);
                try { schedule.scheduledJobs[cancelled.start].cancel(); } catch(e) {};
                console.log(schedule.scheduledJobs);
                message.channel.send("The next meeting has been deleted. Type 'meeting list' to see all upcoming meetings.");
            } else message.channel.send("There are no meetings to delete.");
            break;

        // Lists all of the pending meetings
        case 'list':
            let list = "Upcoming meetings:\n";
            info.meetings.meeting_list.forEach((m) => {
                list += briefMeetingString(m) +"\n";
            });
            message.channel.send(list);
            break;

        // Invalid commands
        default:
            message.channel.send('"' + command + '"' + ' is not recognized as a meeting command.');
            break;
    }
}
// The following methods are for the beginning 
// of a meeting:
function startMeetingJob() {
    resetAbsences(server);
    // removes the top meeting of the sorted meeting list
    let m = info.meetings.meeting_list.shift();
    // sets the current password
    info.meetings.current = m.password;
    
    // send a message every 3 minutes (180000 millis)
    setInterval(() => {
        generalChannel.send(notHereRole.toString() + " there is a meeting right now. Get here as soon as possible and sign in or leave a message explaining why you should be excused.");
    }, 180000);

    // new Date() gets current datetime then we add 20 min to it
    let future = new Date();
    future.setMinutes(future.getMinutes() + 20);
    // Job to stop pinging after 20 minutes by clearing setInterval
    schedule.scheduleJob(future, () => clearInterval());
    // Job to clean up at the end of a meeting
    schedule.scheduleJob($D.parse(m.end), () => {
        // remove the 'Not Here' role from each member
        server.members.forEach((mem) => mem.removeRole(notHereRole).catch(e => {}));
        info.meetings['absent_members'] = [];
        info.meetings.current = null;
        // this is a different job that changes the info
        // at a different time, so we must save again
        saveInfo();
    });
    saveInfo() // save info at the end of the job
}
function resetAbsences(guild) {
    let arr = [];
    guild.members.forEach((mem) => {
        mem.addRole(notHereRole).catch(e => {});
        arr.push(mem.id);
    }); //adds every memeber back to the absent list
    info.meetings['absent_members'] = arr;
}
function removeAbsence(message, id) {
    info.meetings['absent_members'] = info.meetings.absent_members.filter((value) => {
        return value !== id;
    });
    let user = message.guild.members.find(mem => mem.id === id);
    if(user) {
        user.removeRole(notHereRole).catch(e => {});
        return user.nickname ? user.nickname : user.user.username;
    } else return null;
}
// These are the toString methods for our 
// custom meeting objects
function nextMeetingString(meeting) {
    let time = $D.parse(meeting.start);
    return ["There will be a meeting on",time.toString('dddd, MMM dS'),"at",time.toString('t')+".",
    "The meeting will take place at", meeting.location, ".", "It will be",meeting.duration,
    "hours long. Try not to be late!"].join(" ");
}
function briefMeetingString(meeting) {
    let time = $D.parse(meeting.start);
    return ["On", time.toString('MMMM dS, yyyy'), "at", meeting.location].join(" ");
}
function compareMeetings(a, b) {
    return ($D.parse(a.start) < $D.parse(b.start)) ? -1 : 1;
}

/*
 * Meeting related functions

 * Again try to mainain the integrity of a resource objects:
    e.g., 
    resource {
        'id': ...
        'description': ...
        'link': ...
    }
    // all properties of a resource must be kept 
    // as typeof 'string'
*/
function handleResource(args, message) {
    let command = args.shift();
    switch(command) {
        case 'add':

            // expecting _data to be length 4 and of the form
            // [id] [description] [link]
            let _data = parseDashes(args);
            if(_data.length === 3) {

            } else {
                let output = _data.length < 3 ? "Too few" : "Too many";
                output += " arguments provided for resource."
                message.channel.send(output);
            }
            break;
        case 'remove':
            let del_id = args.shift()
            info['resources'] = info.resources.filter(r => {
                return r.id !== del_id;
            });
            message.channel.send('Removed resource named "' + del_id + '" if one existed');
            break;
        case 'fetch':
            let fet_id = args.shift();
            let resource = info.resources.find(r => r.id === fet_id);
            if(resource) {
                message.channel.send(resourceToString(resource));
            } else message.channel.send('Could not find resource: "' + fet_id + '"')
            break;
        default:
            break;
    }
}
function resourceToString(resource) {

}
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
function saveInfo() {
    let newData = JSON.stringify(info, null, 2);
    fs.writeFile(INFO_PATH, newData, err => { if(err) console.log(err); });
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