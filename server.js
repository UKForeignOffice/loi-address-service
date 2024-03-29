// BASE SETUP
// =============================================================================

// call the packages we need
var express = require('express');        // call express
var app = express();                 // define our app using express
var bodyParser = require('body-parser');
var soap = require('soap');
var logger = require('./config/logs')
require('dotenv').config();

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

var port = (process.argv[2] && !isNaN(process.argv[2]) ? process.argv[2] : 3004);        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// healthcheck route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function (req, res) {
    res.json({message: 'Address Service is running'});
});

// more routes for our API will happen here

// healthcheck route
// ----------------------------------------------------------------------------
router.route('/healthcheck')
    .get(function (req, res) {
        res.json({message: 'Address Service is running'});
    });


// route for specific address based on postcode in the form /address/:postcode
// ----------------------------------------------------------------------------
router.route('/lookup/:postcode')
    // get the address with the specified postcode (accessed at GET http://localhost:8080/api/address/lookup/:postcode)
    .get(function (req, res) {

        var authConfig = JSON.parse(process.env.AUTHS)

        // check the config to see if lookups are enabled
        // if not then return this message instead
        if (!authConfig.enabled) {
            return res.json({ message: "No matching address found: no response" });
        }

        /**
		Moved to env config file
		**/
        var authArgs = {
            username: authConfig.username,
            password: authConfig.password
            };

        //GBGroup endpoint to query
        var url = authConfig.gbGroupEndpoint;

        //Product identifier for GBGroup product
        var profileGuid = authConfig.profileGuid;

        soap.createClient(url, function (err, client) {
            if (err) {
               logger.error('GBGroup Connection Failed');
                res.status(500);
                res.json({error: err});
                return;
            }
            client.AuthenticateUser(authArgs, function (err, result) {
                    var args = {
                        "securityHeader": {
                            "authenticationToken": result.authenticationToken,
                            "username": authArgs.username
                        },
                        "addressLookupRequest": {
                            "profileGuid": profileGuid,

                            "address": {
                                "postCode": req.params.postcode
                            }
                        }
                    };

                    client.ExecuteAddressLookup(args, function (err, addResult) {
                        var addressResult = [];
                        var addressResponse = addResult.addressLookupResponse;

                        if (addressResponse) {
                            if (addressResponse.recordsReturned > 0) {
                                logger.info('Successful postcode lookup - Records returned: ' +
                                    addressResponse.recordsReturned +
                                    ' Status: ' + addressResponse.profileHeader.profileStatus +
                                    ' resultStatus: ' + addressResponse.resultStatus);
                                addressResponse.address.forEach(function (address) {
                                    addressResult.push({
                                        organisation: typeof (address.organisation) != 'undefined' ? address.organisation : null,
                                        house_name: getHouseName(address),
                                        street: getStreet(address),
                                        town: address.town,
                                        county: address.stateRegion || '',
                                        postcode: address.postCode.toUpperCase(),
                                        full: address.formattedAddress
                                    });
                                });
                                res.json(addressResult);
                            } else {
                                logger.info("Address not found with given postcode");
                                res.json({message: "No matching address found: no address"});
                            }
                        } else {
                            logger.error("No response received from GBGroup", err);
                            res.json({message: "No matching address found: no response"});
                        }

                    });
                }
            )
            ;
        });
    });

function getHouseName(address){
    if(typeof(address.subBuilding)!='undefined' && typeof(address.buildingNumber)!='undefined'&& typeof(address.buildingName)!='undefined'){
        return  address.subBuilding+', '+address.buildingName + (address.buildingNumber ? ', '+address.buildingNumber :'');
    }
    else if(typeof(address.subBuilding)!='undefined'){
        return address.subBuilding+', '+(address.buildingName || address.buildingNumber);
    }
    if(typeof(address.subBuilding)=='undefined' && typeof(address.buildingName)!='undefined'){
        return address.buildingName;
    }
    if(typeof(address.subBuilding)=='undefined' &&typeof(address.buildingName)=='undefined'){
        return address.buildingNumber;
    }
}

function getStreet(address){
    if(typeof(address.subStreet)!='undefined'){
        return address.subStreet+', '+address.street;
    } else {
        return address.street;
    }
}

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api/address
app.use('/api/address', router);

// START THE SERVER
// =============================================================================
app.listen(port);
logger.info('is-address-service running on port ' + port);
let authConfig = JSON.parse(process.env.AUTHS)
if (!authConfig.enabled) {
    logger.info('address lookups are currently disabled, please set "enabled":true in the config');
}
module.exports = app;
