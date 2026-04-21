const app = require('../server.js')
const supertest = require('supertest')(app)
const assert = require('node:assert')
const axios = require('axios')
const timeoutInMilliseconds = 15000
const httpOkStatus = 200
const httpInternalErrorStatus = 500

describe('Address Service', () => {
  it('should return healthcheck message "Address Service is running" on /api/address/healthcheck GET', (done) => {
    supertest
      .get('/api/address/healthcheck')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.message, 'Address Service is running')
        done()
      })
  })

  it('should return Kainos Software address on /api/address/lookup/BT71NT GET', function (done) {
    this.timeout(timeoutInMilliseconds)
    supertest
      .get('/api/address/lookup/BT71NT')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert(Array.isArray(res.body), 'Response body should be an array')
        assert(res.body.length > 0, 'Response should contain addresses')

        const kainosAddress = res.body.find((address) => (address.text || '').includes('Kainos Software Ltd'))

        assert(kainosAddress, 'Kainos Software Ltd address should be in the response')
        assert(kainosAddress.id && kainosAddress.id.trim() !== '', 'Address id should be populated')

        if (kainosAddress.description && kainosAddress.description.trim() !== '') {
          assert.strictEqual(
            kainosAddress.text,
            'Kainos Software Ltd 4-6 Upper Crescent',
            'Text should contain only the address without postcode',
          )
          assert(kainosAddress.description.includes('Belfast BT7 1NT'), 'Description should contain Belfast BT7 1NT')
        } else {
          assert.strictEqual(
            kainosAddress.text,
            'Kainos Software Ltd 4-6 Upper Crescent Belfast BT7 1NT',
            'Text should contain full address including postcode',
          )
        }

        done()
      })
  })

  it('should return "No matching address found" on /api/address/lookup/INVALID GET', function (done) {
    this.timeout(timeoutInMilliseconds)
    supertest
      .get('/api/address/lookup/-')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.message, 'No matching address found: no address')
        done()
      })
  })

  it('should return detailed address for valid ID on /api/address/retrieve/:id GET', function (done) {
    this.timeout(timeoutInMilliseconds)
    const testId = 'GB|RM|A|3126415|ENG'
    supertest
      .get(`/api/address/retrieve/${testId}`)
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        const address = res.body
        assert.strictEqual(address.organisation, 'Kainos Software Ltd')
        assert.strictEqual(address.house_name, '4-6')
        assert.strictEqual(address.street, 'Upper Crescent')
        assert.strictEqual(address.town, 'Belfast')
        assert.strictEqual(address.county, 'County Antrim')
        assert.strictEqual(address.postcode, 'BT7 1NT')
        assert(address.full.includes('Kainos Software Ltd'), 'Full address should contain organisation name')
        done()
      })
  })

  it('should return 500 Internal Server Error for invalid ID on /api/address/retrieve/:id GET', function (done) {
    this.timeout(timeoutInMilliseconds)
    const invalidId = 'INVALID_ID'
    supertest
      .get(`/api/address/retrieve/${invalidId}`)
      .expect(httpInternalErrorStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.error, 'Internal server error', 'Error message should match')
        done()
      })
  })

  it('should return "service disabled" when service is disabled on /api/address/lookup/:postcode GET', (done) => {
    process.env.AUTHS = JSON.stringify({ enabled: false })

    supertest
      .get('/api/address/lookup/BT71NT')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.message, 'No matching address found: service disabled')
        done()
      })
  })

  it('should return "service disabled" when service is disabled on /api/address/retrieve/:id GET', (done) => {
    process.env.AUTHS = JSON.stringify({ enabled: false })

    const testId = 'GB|RM|A|3126415|ENG'
    supertest
      .get(`/api/address/retrieve/${testId}`)
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.message, 'No matching address found: service disabled')
        done()
      })
  })
})

describe('Address Service (mocked)', () => {
  let originalAxiosGet
  let originalAuths
  const mockAuth = {
    enabled: true,
    apiKey: 'test-key',
    url: 'https://example.test',
  }

  before(() => {
    originalAxiosGet = axios.get
    originalAuths = process.env.AUTHS
  })

  beforeEach(() => {
    process.env.AUTHS = JSON.stringify(mockAuth)
  })

  afterEach(() => {
    axios.get = originalAxiosGet
    process.env.AUTHS = originalAuths
  })

  it('should return health message on /api/address GET', (done) => {
    supertest
      .get('/api/address')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.message, 'Address Service is running')
        done()
      })
  })

  it('should return direct address items when lookup response has no postcode container', (done) => {
    axios.get = async () => ({
      data: {
        Items: [
          {
            Type: 'Address',
            Id: 'A1',
            Text: '1 Any Street',
            Description: 'Belfast BT1 1AA',
          },
          {
            Type: 'Building',
            Id: 'B1',
            Text: 'Ignore me',
            Description: 'Ignore me',
          },
        ],
      },
    })

    supertest
      .get('/api/address/lookup/BT11AA')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.deepStrictEqual(res.body, [{ id: 'A1', text: '1 Any Street', description: 'Belfast BT1 1AA' }])
        done()
      })
  })

  it('should resolve postcode containers and combine only address items', (done) => {
    const calls = []
    axios.get = (url, config) => {
      calls.push({ url, params: config.params })

      if (!config.params.Container) {
        return {
          data: {
            Items: [
              { Type: 'Postcode', Id: 'PC1' },
              { Type: 'Postcode', Id: 'PC2' },
              { Type: 'Building', Id: 'B1' },
            ],
          },
        }
      }

      if (config.params.Container === 'PC1') {
        return {
          data: {
            Items: [
              {
                Type: 'Address',
                Id: 'A1',
                Text: '10 Main St',
                Description: 'Town AA1 1AA',
              },
              {
                Type: 'Building',
                Id: 'B2',
                Text: 'Non-address',
                Description: 'Ignore',
              },
            ],
          },
        }
      }

      return {
        data: {
          Items: [
            {
              Type: 'Address',
              Id: 'A2',
              Text: '11 Main St',
              Description: 'Town AA1 1AA',
            },
          ],
        },
      }
    }

    supertest
      .get('/api/address/lookup/AA11AA')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.deepStrictEqual(res.body, [
          { id: 'A1', text: '10 Main St', description: 'Town AA1 1AA' },
          { id: 'A2', text: '11 Main St', description: 'Town AA1 1AA' },
        ])
        assert.strictEqual(calls.length, 3)
        assert.strictEqual(calls[1].params.Container, 'PC1')
        assert.strictEqual(calls[2].params.Container, 'PC2')
        done()
      })
  })

  it('should return no-address message when lookup has empty items', (done) => {
    axios.get = () => ({ data: { Items: [] } })

    supertest
      .get('/api/address/lookup/ZZ99ZZ')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.message, 'No matching address found: no address')
        done()
      })
  })

  it('should return no-address message when lookup payload is missing items', (done) => {
    axios.get = () => ({ data: {} })

    supertest
      .get('/api/address/lookup/ZZ99ZZ')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.message, 'No matching address found: no address')
        done()
      })
  })

  it('should return internal error when lookup request throws', (done) => {
    axios.get = () => {
      throw new Error('lookup failed')
    }

    supertest
      .get('/api/address/lookup/BT11AA')
      .expect(httpInternalErrorStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.error, 'Internal server error')
        done()
      })
  })

  it('should return detailed address for retrieve with full house and secondary street', (done) => {
    axios.get = async () => ({
      data: {
        Items: [
          {
            Company: 'Acme Ltd',
            SubBuilding: 'Flat 2',
            BuildingName: 'River House',
            BuildingNumber: '9',
            SecondaryStreet: 'Market Lane',
            Street: 'High Street',
            City: 'Belfast',
            Province: 'County Antrim',
            PostalCode: 'bt1 2aa',
            Label: 'Acme Ltd, Flat 2, River House, 9 Market Lane, High Street, Belfast, BT1 2AA',
          },
        ],
      },
    })

    supertest
      .get('/api/address/retrieve/ID1')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.deepStrictEqual(res.body, {
          organisation: 'Acme Ltd',
          house_name: 'Flat 2, River House, 9',
          street: 'Market Lane, High Street',
          town: 'Belfast',
          county: 'County Antrim',
          postcode: 'BT1 2AA',
          full: 'Acme Ltd, Flat 2, River House, 9 Market Lane, High Street, Belfast, BT1 2AA',
        })
        done()
      })
  })

  it('should format retrieve address when only sub-building and building name are present', (done) => {
    axios.get = async () => ({
      data: {
        Items: [
          {
            Company: '',
            SubBuilding: 'Suite 4',
            BuildingName: 'Phoenix House',
            SecondaryStreet: '',
            Street: 'King Street',
            City: 'Lisburn',
            Province: '',
            PostalCode: 'BT28 1AB',
            Label: 'Suite 4, Phoenix House, King Street, Lisburn, BT28 1AB',
          },
        ],
      },
    })

    supertest
      .get('/api/address/retrieve/ID2')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.organisation, null)
        assert.strictEqual(res.body.house_name, 'Suite 4, Phoenix House')
        assert.strictEqual(res.body.street, 'King Street')
        assert.strictEqual(res.body.county, '')
        done()
      })
  })

  it('should return no-details message when retrieve has no items', (done) => {
    axios.get = () => ({ data: { Items: [] } })

    supertest
      .get('/api/address/retrieve/NONE')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.message, 'No matching address found: no details')
        done()
      })
  })

  it('should return no-details message when retrieve payload is missing items', (done) => {
    axios.get = () => ({ data: {} })

    supertest
      .get('/api/address/retrieve/NONE')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.message, 'No matching address found: no details')
        done()
      })
  })

  it('should format retrieve address when sub-building uses building number fallback', (done) => {
    axios.get = async () => ({
      data: {
        Items: [
          {
            Company: 'Widgets Ltd',
            SubBuilding: 'Unit A',
            BuildingNumber: '22',
            Street: 'Harbour Road',
            City: 'Bangor',
            Province: 'Down',
            PostalCode: 'bt20 1aa',
            Label: 'Widgets Ltd, Unit A, 22 Harbour Road, Bangor, BT20 1AA',
          },
        ],
      },
    })

    supertest
      .get('/api/address/retrieve/ID3')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.house_name, 'Unit A, 22')
        assert.strictEqual(res.body.street, 'Harbour Road')
        done()
      })
  })

  it('should format retrieve address when only building name is present', (done) => {
    axios.get = async () => ({
      data: {
        Items: [
          {
            BuildingName: 'Rose Court',
            City: 'Belfast',
            Province: 'County Antrim',
            PostalCode: 'BT1 5AA',
            Label: 'Rose Court, Belfast, BT1 5AA',
          },
        ],
      },
    })

    supertest
      .get('/api/address/retrieve/ID4')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.house_name, 'Rose Court')
        assert.strictEqual(res.body.street, '')
        done()
      })
  })

  it('should format retrieve address when only building number is present', (done) => {
    axios.get = async () => ({
      data: {
        Items: [
          {
            BuildingNumber: '17',
            Street: 'Castle Street',
            City: 'Newry',
            Province: 'Down',
            PostalCode: 'BT34 2AA',
            Label: '17 Castle Street, Newry, BT34 2AA',
          },
        ],
      },
    })

    supertest
      .get('/api/address/retrieve/ID5')
      .expect(httpOkStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.house_name, '17')
        assert.strictEqual(res.body.street, 'Castle Street')
        done()
      })
  })

  it('should return internal error when retrieve request throws', (done) => {
    axios.get = () => Promise.reject(new Error('retrieve failed'))

    supertest
      .get('/api/address/retrieve/BAD')
      .expect(httpInternalErrorStatus)
      .end((err, res) => {
        if (err) return done(err)
        assert.strictEqual(res.body.error, 'Internal server error')
        done()
      })
  })
})
