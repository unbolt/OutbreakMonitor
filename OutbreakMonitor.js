
var config          = require('./config');
var express         = require('express');
var mongoose        = require('mongoose');
var assert          = require('assert');
var twitter         = require('twitter');
var moment          = require('moment');
var GoogleMapsAPI   = require('googlemaps');
var app             = express();

// MONGOOOOOOOOse
mongoose.connect(config.mongo.url);

// Mongoose models
var Tweet = require('./models/tweet');
var Location = require('./models/location');

// Twitter connection
var client = new twitter({
    consumer_key : config.twitter.consumer_key,
    consumer_secret : config.twitter.consumer_secret,
    access_token_key : config.twitter.access_token_key,
    access_token_secret : config.twitter.access_token_secret
});

// Google maps connection
var googleConfig = {
    key: config.google.api_key
}

var gmAPI = new GoogleMapsAPI(googleConfig);

client.stream('statuses/filter', { track: config.twitter.track_words },  function(stream){
    stream.on('data', function(tweet) {
        // Twitters API does not let us filter for geocoded tweets right off the bat, so we now have to check if this tweet
        // is actually geocoded or not.
        if(tweet.place) {
            // Save the tweet if its got a location on it
            console.log(tweet.text);
            
            var timestamp = moment(tweet.created_at, "ddd MMM DD HH:mm:ss ZZ YYYY");
            
            console.log('Formatted time: ' + timestamp.format());
            
            // If the user has a UTC offset then we can calculate the local time
            // If not then we will just use the current time of the tweet
            // Not sure on long term effects of this, will need to monitor.
            if(tweet.user.utc_offset) {
                tweet.user.utc_offset = parseInt(tweet.user.utc_offset)
                timestamp.utcOffset(tweet.user.utc_offset / 60);
                tweet.local_time = timestamp.format();
                console.log('Local time: ' + tweet.local_time);
            } else {
                tweet.local_time = timestamp.format();
                console.log('Local time: ' + tweet.local_time);
            }
            
            // Create the tweet
            var save_tweet = new Tweet();
            save_tweet.created_at = tweet.created_at;
            save_tweet.text = tweet.text;
            save_tweet.place.id = tweet.place.id;
            save_tweet.place.place_type = tweet.place.place_type;
            save_tweet.place.name = tweet.place.name;
            save_tweet.place.full_name = tweet.place.place_name;
            save_tweet.place.country_code = tweet.place.country_code;
            save_tweet.place.country = tweet.place.country;
            save_tweet.local_time = tweet.local_time;
            
            // Check if we have this location saved yet or not
            Location.find({ id: tweet.place.id }, function(err, location) {
                assert.equal(null, err);
                
                // Check if we have this location geocoded
                if(location.lat == null) {
                    console.log('This is not a geocoded location.');
                    console.log('Location name: ' + tweet.place.full_name );
                    
                    // Geolocate this place!
                    gmAPI.geocode({ 'address' : tweet.place.full_name},  function(err, result) {
                       console.log(result.results[0].geometry.location.lat); 
                       console.log(result.results[0].geometry.location.lng);
                        // We need to save the location bro
                        var save_location = new Location();
                        save_location.id = tweet.place.id;
                        save_location.lat = result.results[0].geometry.location.lat;
                        save_location.lng = result.results[0].geometry.location.lng;
                        
                        // Save the location
                        save_location.save(function(err) {
                            assert.equal(null, err);
                            console.log('Location saved.');
                            
                            // Now we can update the tweets location and save it
                            save_tweet.place.lat = result.results[0].geometry.location.lat;
                            save_tweet.place.lng = result.results[0].geometry.location.lng;
                            
                            save_tweet.save(function(err) {
                               assert.equal(null, err);
                                console.log('Tweet saved.');
                            });
                        });
                    });
                } else {
                    // This place exists in the database omg wtf
                    save_tweet.place.lat = location.lat;
                    save_tweet.place.lng = location.lng;
                    
                    save_tweet.save(function(err) {
                        assert.equal(null, err);
                        console.log('Tweet saved.');
                    });
                }
            });
            
            
            
        } 
    });

    stream.on('error', function(error) {    
        console.log(error);
    });
});

// Setup our API
var port = 666;

// ROUTES FOR API
// =======================================================================
var router = express.Router();

// Middleware
router.use(function(req, res, next) {
   console.log('Things are happening!');
    next();
});

// Just return a whatsup message
router.get('/', function(req, res) {
    
    var options = {
        root: __dirname + '/public/',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };
    
    res.sendFile('index.html', options);
});

router.get('/lib/:name', function (req, res, next) {

    var options = {
        root: __dirname + '/public/lib/',
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    var fileName = req.params.name;
    res.sendFile(fileName, options);
});

// Setup the routes for retrieving locations
router.route('/locations')

    .get(function(req, res) {
    
        Tweet.find(function(err, tweets) {
            assert.equal(null, err);
            
            res.json(tweets);
        });
    
    });

// REGISTER THE ROUTES ---------------------------------------------------
// All routes are prefixed with /api
app.use('/', router);

// START THE SERVER
// =======================================================================
app.listen(port);
console.log('We are listening on port ' + port);