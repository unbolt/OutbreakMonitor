var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;

var LocationSchema = new Schema({
    id: String,
    lat: String,
    lng: String
});

module.exports = mongoose.model('Location', LocationSchema);