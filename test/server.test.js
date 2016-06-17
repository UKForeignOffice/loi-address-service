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
                res.body.message.should.equal('is-address-service running');
                done();
            });
    });

    it('should return Informed Solutions address on /api/address/WA144PA GET', function(done) {
        supertest
            .get('/api/address/lookup/WA144PA')
            .expect(200)
            .end(function(err,res) {
                if(err) done(err);
               // res.body[1].organisation.should.equal('Informed Solutions Ltd');
               // res.body[1].house_name.should.equal('The Old Bank');
                res.body[1].postcode.should.equal('WA14 4PA');
                done();
            });
    });

    it('should return "No matching address found" on /api/address/INVALID GET', function(done) {
        supertest
            .get('/api/address/lookup/INVALID')
            .expect(200)
            .end(function(err,res) {
                if(err) done(err);
                res.body.message.should.equal('No matching address found: no response');
                done();
            });
    });
});
