const app = require('../server.js');
const supertest = require('supertest')(app);
const assert = require('assert');

describe('Address Service', function () {
    it('should return healthcheck message "Address Service is running" on /api/address/healthcheck GET', function (done) {
        supertest
            .get('/api/address/healthcheck')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                assert.strictEqual(res.body.message, 'Address Service is running');
                done();
            });
    });

    it('should return Kainos Software address on /api/address/lookup/BT71NT GET', function (done) {
        this.timeout(15000);
        supertest
            .get('/api/address/lookup/BT71NT')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                assert(Array.isArray(res.body), 'Response body should be an array');
                assert(res.body.length > 0, 'Response should contain addresses');

                const kainosAddress = res.body.find(
                    (address) => address.id === 'GB|RM|A|3126415|ENG'
                );

                assert(kainosAddress, 'Kainos Software Ltd address should be in the response');
                assert.strictEqual(kainosAddress.id, 'GB|RM|A|3126415|ENG');

                if (kainosAddress.description && kainosAddress.description.trim() !== '') {
                    assert.strictEqual(kainosAddress.text, 'Kainos Software Ltd 4-6 Upper Crescent', 'Text should contain only the address without postcode');
                    assert(kainosAddress.description.includes('Belfast BT7 1NT'), 'Description should contain Belfast BT7 1NT');
                } else {
                    assert.strictEqual(kainosAddress.text, 'Kainos Software Ltd 4-6 Upper Crescent Belfast BT7 1NT', 'Text should contain full address including postcode');
                }

                done();
            });
    });

    it('should return "No matching address found" on /api/address/lookup/INVALID GET', function (done) {
        this.timeout(15000);
        supertest
            .get('/api/address/lookup/-')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                assert.strictEqual(res.body.message, 'No matching address found: no address');
                done();
            });
    });

    it('should return detailed address for valid ID on /api/address/retrieve/:id GET', function (done) {
        this.timeout(15000);
        const testId = 'GB|RM|A|3126415|ENG';
        supertest
            .get(`/api/address/retrieve/${testId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                const address = res.body;
                assert.strictEqual(address.organisation, 'Kainos Software Ltd');
                assert.strictEqual(address.house_name, '4-6');
                assert.strictEqual(address.street, 'Upper Crescent');
                assert.strictEqual(address.town, 'Belfast');
                assert.strictEqual(address.county, 'County Antrim');
                assert.strictEqual(address.postcode, 'BT7 1NT');
                assert(address.full.includes('Kainos Software Ltd'), 'Full address should contain organisation name');
                done();
            });
    });

    it('should return 500 error for invalid ID on /api/address/retrieve/:id GET', function (done) {
        this.timeout(15000);
        const invalidId = 'INVALID_ID';
        supertest
            .get(`/api/address/retrieve/${invalidId}`)
            .expect(500)
            .end((err, res) => {
                if (err) return done(err);
                assert.strictEqual(res.body.error, 'Internal server error', 'Error message should match');
                done();
            });
    });

    it('should return "service disabled" when service is disabled on /api/address/lookup/:postcode GET', function (done) {
        process.env.AUTHS = JSON.stringify({ enabled: false });

        supertest
            .get('/api/address/lookup/BT71NT')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                assert.strictEqual(res.body.message, 'No matching address found: service disabled');
                done();
            });
    });

    it('should return "service disabled" when service is disabled on /api/address/retrieve/:id GET', function (done) {
        process.env.AUTHS = JSON.stringify({ enabled: false });

        const testId = 'GB|RM|A|3126415|ENG';
        supertest
            .get(`/api/address/retrieve/${testId}`)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                assert.strictEqual(res.body.message, 'No matching address found: service disabled');
                done();
            });
    });
});