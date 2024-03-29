var app = require('../server.js');
var supertest = require('supertest')(app);
var should = require('should');


describe('Address Service', function() {

    it('should return healthcheck message "is-address-service running" on /api/address/healthcheck GET', function(done) {
        supertest
            .get('/api/address/healthcheck')
            .expect(200)
            .end(function(err,res) {
                if(err) done(err);
                res.body.message.should.equal('Address Service is running');
                done();
            });
    });

    it('should return Kainos Software address on /api/address/lookup/BT71NT GET', function(done) {
        this.timeout(15000);
        supertest
            .get('/api/address/lookup/BT71NT')
            .expect(200)
            .end(function(err,res) {
                if(err) done(err);
                res.body.length.should.equal(12)
                res.body[0].organisation.should.equal('Kainos Software Ltd')
                res.body[0].house_name.should.equal('4-6')
                res.body[0].street.should.equal('Upper Crescent')
                res.body[0].town.should.equal('BELFAST')
                res.body[0].postcode.should.equal('BT7 1NT')
                done();
            });
    });

    it('should return "No matching address found" on /api/address/lookup/INVALID GET', function(done) {
        this.timeout(15000);
        supertest
            .get('/api/address/lookup/INVALID')
            .expect(200)
            .end(function(err,res) {
                if(err) done(err);
                res.body.message.should.equal('No matching address found: no address');
                done();
            });
    });
});
