const mongoose = require("mongoose");

const resourceSchema = mongoose.Schema({
    name: String,
    group: String,
    description: String,
    link: String
});

class ResourceClass {
    get fullResource() {
        return [this.description + ":",this.link].join(" ");
    }
}
resourceSchema.loadClass(ResourceClass);

// Exports
module.exports = mongoose.model('Resource', resourceSchema);;