// Imports
// Datetime configuration and scheduling
const $D = require('../utils/date.js');
Date = $D.Date;
const schedule = require('node-schedule');
// Model functions
var Meeting = require('../schemas/meeting.js'); 
var Job = require('../schemas/job.js');
// Globals
var guild;
var currentMeeting = null;
const utils = require('../utils/utils.js');


function handleMeeting(args, message, gld) {
    guild = gld;

    let command = args.shift();
    switch (command) {
        case 'pending':
            message.channel.send("There are "+ Object.keys(schedule.scheduledJobs).length + " jobs pending.").catch(O_o => {});
            break;
        // Adding a new meeting
        case 'add':
            // checks permissions, breaks if false
            if(!utils.isAuthorized(message, 'Project Heads')) break;

            // expecting _data to be length 4 and of the form
            // [startTime] [location] [duration: hoursString] [password]
            let _data = utils.parseCustom(args);
            if(_data.length === 4) {
                // start is a js Date object
                let start = $D.parse(_data[0])
                let end = $D.parse(_data[0]).add({hours: _data[2]});
                // check that it was parsed correctly
                if(start) {
                    let meeting = {
                        'start': start,
                        'end': end,
                        'location': _data[1],
                        'duration': _data[2],
                        'password': _data[3] 
                    };
                    Meeting.create(meeting, (err,doc) => {
                        if(!err) _createFullMeeting(message, doc);
                        console.log(doc);
                    });
                } else message.channel.send('"'+_data[0]+'" could not be recognized as a valid date and time.'); 
            } else message.channel.send((_data.length < 4 ? "Too few" : "Too many") + " arguments provided for meeting.");
            break;
        
        // Remove the next scheduled meeting
        case 'cancel':
            if(!utils.isAuthorized(message, 'Project Heads')) break;
            performOnSortedMeetings(message, function(message, docs) {
                if(docs[0]) {
                    Meeting.deleteOne({start: docs[0].start}, err => {if(err) console.log(err);});
                    Job.deleteOne({date: docs[0].start}, err => {if(err) console.log(err);});
                    try {
                        schedule.scheduledJobs[docs[0].start.toString()].cancel()
                    } catch(e) { console.log(e); }
                    message.channel.send("The next meeting has been deleted. Type 'meeting list' to see all upcoming meetings.");
                } else message.channel.send("There are no upcoming meetings to delete.");
            });
            break;

        // Signing into a meeting
        case 'signin':
            if(!currentMeeting) message.channel.send("There is no meeting to sign into.");
            // checks that the password is valid
            if(args.shift() === currentMeeting.password) {
                let userid = message.author.id;
                let name = removeAbsence(message, userid);
                if(name) message.channel.send(name + " has been signed in.");
                else message.channel.send("Could not sign in " + message.author);
            } else message.channel.send("Incorrect password or no password provided.");
            break;
        
        // Same as signin but to excuse someone via mentioning
        case 'excuse':
            if(!utils.isAuthorized(message, 'Project Heads')) break;

            message.mentions.users.forEach(user => {
                let name = removeAbsence(message, user.id)
                if(name) message.channel.send(name + " was excused from the current meeting.");
                else message.channel.send("Could not excuse " + user + " from the meeting.");
            });
            break;
        
        //Calls the toString of the next meeting
        case 'next':
            performOnSortedMeetings(message, function(message, docs) {
                if(docs[0]) message.channel.send(docs[0].nextString);
                else message.channel.send("There are no upcoming meetings.");
            });
            break;

        // Lists all of the pending meetings
        case 'list':
            performOnSortedMeetings(message, function(message, docs) {
                let list = "";
                docs.forEach(m => list += m.briefString +"\n");
                if(list !== "") message.channel.send("Upcoming meetings:\n" + list);
                else message.channel.send("There are no upcoming meetings.");
            });
            break;

        // Add meeting notes
        case 'note':
            if(!currentMeeting) message.channel.send("There is no meeting currently being held.");
            else {
                if(!utils.isAuthorized(message, 'Project Heads', 'Secretary')) break;
                let note = args.join(" ");
                currentMeeting.notes.push(note);
                message.channel.send("Noted.");
            }
            break;

        // Invalid commands
        default:
            message.channel.send('"' + command + '"' + ' is not recognized as a meeting command.');
            break;
    }
}
function resetAbsences(guild) {
    let notHereRole = guild.roles.find(r => r.name === 'Not Here'); 
    guild.members.forEach(mem => mem.addRole(notHereRole).catch(O_o => {}));
}
function removeAbsence(message, id) {
    let user = message.guild.members.find(mem => mem.id === id);
    if(user) {
        let notHereRole = message.guild.roles.find(r => r.name === 'Not Here'); 
        user.removeRole(notHereRole).catch(O_o => {});
        return user.nickname || user.user.username;
    } else return null;
}
function performOnSortedMeetings(message, func) {
    Meeting.find({}).sort({start: 1}).exec((err,docs) => {
        if (err) message.channel.send("There was an error while trying to perform the request.");
        else func(message, docs);
    });
}
function _createFullMeeting(message, meeting) {
    // schedule function for the date of the meeting
    // meeting.start is used as the name of the job so that it can be cancelled if necessary
    schedule.scheduleJob(meeting.start.toString(), meeting.start, () => startMeetingJob(guild));
    Job.create({date: meeting.start, name: meeting.start.toString()}, err => {
        if(!err) {
            message.channel.send("A meeting has been added on " + meeting.start.toString('F') + ".");
            utils.announce(message, 'announcements', meeting);
        }
    }); 
}
function startMeetingJob(guild) {
    resetAbsences(guild);
    let now = new Date();
    Meeting.findOneAndDelete({start: {$lte: now}}, (err,doc) => {
        if(!err) {
            Job.deleteOne({date: doc.start}, e => {});
            currentMeeting = doc;
            currentMeeting['notes'] = [];
            console.log(currentMeeting);

            // send an alert every 3 minutes (180000 millis)
            setInterval(() => _notify(guild), 180000);
            now.setMinutes(now.getMinutes() + 20);
            schedule.scheduleJob(now, () => clearInterval());
            schedule.scheduleJob(doc.end, () => _endMeeting(guild));
        }
    });
}
function _notify(guild) {
    let generalChannel = guild.channels.find(el => el.name === 'general');
    let notHereRole = guild.roles.find(r => r.name === 'Not Here');
    generalChannel.send(notHereRole.toString() + " there is a meeting right now. Get here as soon as possible and sign in or leave a message explaining why you should be excused.");
}
function _endMeeting(guild) {
    clearInterval();
    _postMeetingNotes(guild, new Date());
    let notHereRole = guild.roles.find(r => r.name === 'Not Here');
    guild.members.forEach(mem => mem.removeRole(notHereRole).catch(O_o => {}));
    currentMeeting = null;
}
function _postMeetingNotes(guild, date) {
    let final = "Meeting Notes " + date.toString('MMMM dS, yyyy') + ":\n-";
    final += currentMeeting.notes.join("\n-");
    utils.announce(guild, 'meeting-notes', final);
}

// Exports
module.exports.handler = handleMeeting;
module.exports.startMeetingJob = startMeetingJob;