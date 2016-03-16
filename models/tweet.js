var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;

var TweetSchema = new Schema({
    created_at: String,
    text: String,
    place: {
        id: String,
        place_type: String,
        name: String,
        full_name: String,
        country_code: String,
        country: String,
        lat: String,
        lng: String
    },
    local_time: String,

});

module.exports = mongoose.model('Tweet', TweetSchema);