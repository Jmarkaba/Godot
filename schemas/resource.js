const mongoose = require("mongoose");

const resourceSchema = mongoose.Schema({
    id: String,
    group: String,
    description: String,
    link: String
});

class ResourceClass {
    get getName() {
        return this.id;
    }
    get fullResource() {
        return this.description,": ","(",this.link,")";
    }
}
resourceSchema.loadClass(ResourceClass);

// Exports
module.exports = mongoose.model('Resource', resourceSchema);;