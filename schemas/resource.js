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
    // Convenience method
    get announceString() {
        return "@everyone A new resource has been added. " + this.fullResource;
    }
}
resourceSchema.loadClass(ResourceClass);

// Exports
module.exports = mongoose.model('Resource', resourceSchema);;