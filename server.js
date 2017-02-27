// BASE SETUP
// =============================================================================

// call the packages we need
var express = require('express');        // call express
var app = express();                 // define our app using express
var bodyParser = require('body-parser');
var soap = require('soap');
var dotenv = require('dotenv');
var env = dotenv.config();
require('./config/logs');

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

var port = (process.argv[2] && !isNaN(process.argv[2]) ? process.argv[2] : 3003);        // set our port

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
        var url = 'https://idmp.gb.co.uk/idm-globalservices-ws/GlobalServices15b.wsdl';

		/**
		Moved to env config file
		**/
        var authArgs =  JSON.parse(env.AUTHS);

        var Guid = require('guid');
        var guid = new Guid('6C49BC44-C104-41b2-BB62-2AE45A09DD54');
        soap.createClient(url, function (err, client) {
            if (err) {
                console.error('GBGroup Connection Failed');
                res.status(500);
                res.json({error: err});
                return;
            }
            client.AuthenticateUser(authArgs, function (err, result) {
                    var IdmDataSearchAddress = {'postCode': req.params.postcode};
                    var args = {
                        "securityHeader": {
                            "authenticationToken": result.authenticationToken,
                            "username": authArgs.username
                        },
                        "addressLookupRequest": {
                            "profileGuid": guid.value,

                            "address": {
                                "postCode": req.params.postcode
                            }
                        }
                    };
                    var c2 = null;
                    soap.createClient(url, function (err, client2) {
                        if (err){
                            console.error(err);
                        }
                        c2 = client2;
                        client2.ExecuteAddressLookup(args, function (err, addResult) {
                            console.info('Successful postcode lookup');
                            var addressResult = [];
                            var addressResponse = addResult.addressLookupResponse;
                            if (addressResponse && addressResponse.address) {
                                console.info('Successful postcode lookup - Records returned: ' +
                                    addressResponse.recordsReturned +
                                    ' Status: ' + addressResponse.profileHeader.profileStatus +
                                    ' resultStatus: ' + addressResponse.resultStatus);
                                var addresses = addressResponse.address;
                                if (addresses.length > 0) {
                                    addressResponse.address.forEach(function (address) {
                                        addressResult.push({
                                            organisation:typeof(address.organisation)!='undefined'? address.organisation : null,
                                            house_name: getHouseName(address),
                                            street: address.street,
                                            town: address.town,
                                            county: address.stateRegion || '' ,
                                            postcode: address.postCode.toUpperCase(),
                                            full : address.formattedAddress
                                        });
                                    });
                                }
                                else {
                                    console.info("Address not found with given postcode");
                                    res.json({message: "No matching address found: no address"});
                                }
                            }
                            else {
                                console.error("No response received from GBGroup");
                                res.json({message: "No matching address found: no response"});
                            }

                            res.json(addressResult);
                        });
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

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api/address
app.use('/api/address', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('is-address-service running on port ' + port);

module.exports = app;