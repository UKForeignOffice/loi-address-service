import axios from 'axios'
import supertestLib from 'supertest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../server.js'

const supertest = supertestLib(app)

const httpOkStatus = 200
const httpInternalErrorStatus = 500

describe('Address Service', () => {
  it('should return healthcheck message "Address Service is running" on /api/address/healthcheck GET', async () => {
    const res = await supertest.get('/api/address/healthcheck').expect(httpOkStatus)
    expect(res.body.message).toBe('Address Service is running')
  })

  it('should return Kainos Software address on /api/address/lookup/BT71NT GET', async () => {
    const res = await supertest.get('/api/address/lookup/BT71NT').expect(httpOkStatus)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    const kainosAddress = res.body.find((address) => (address.text || '').includes('Kainos Software Ltd'))
    expect(kainosAddress).toBeTruthy()
    expect(kainosAddress.id?.trim()).toBeTruthy()
    if (kainosAddress.description?.trim() !== '') {
      expect(kainosAddress.text).toBe('Kainos Software Ltd 4-6 Upper Crescent')
      expect(kainosAddress.description).toContain('Belfast BT7 1NT')
    } else {
      expect(kainosAddress.text).toBe('Kainos Software Ltd 4-6 Upper Crescent Belfast BT7 1NT')
    }
  })

  it('should return "No matching address found" on /api/address/lookup/INVALID GET', async () => {
    const res = await supertest.get('/api/address/lookup/-').expect(httpOkStatus)
    expect(res.body.message).toBe('No matching address found: no address')
  })

  it('should return detailed address for valid ID on /api/address/retrieve/:id GET', async () => {
    const testId = 'GB|RM|A|3126415|ENG'
    const res = await supertest.get(`/api/address/retrieve/${testId}`).expect(httpOkStatus)
    const address = res.body
    expect(address.organisation).toBe('Kainos Software Ltd')
    expect(address.house_name).toBe('4-6')
    expect(address.street).toBe('Upper Crescent')
    expect(address.town).toBe('Belfast')
    expect(address.county).toBe('County Antrim')
    expect(address.postcode).toBe('BT7 1NT')
    expect(address.full).toContain('Kainos Software Ltd')
  })

  it('should return 500 error for invalid ID on /api/address/retrieve/:id GET', async () => {
    const invalidId = 'INVALID_ID'
    const res = await supertest.get(`/api/address/retrieve/${invalidId}`).expect(httpInternalErrorStatus)
    expect(res.body.error).toBe('Internal server error')
  })

  it('should return "service disabled" when service is disabled on /api/address/lookup/:postcode GET', async () => {
    process.env.AUTHS = JSON.stringify({ enabled: false })
    const res = await supertest.get('/api/address/lookup/BT71NT').expect(httpOkStatus)
    expect(res.body.message).toBe('No matching address found: service disabled')
  })

  it('should return "service disabled" when service is disabled on /api/address/retrieve/:id GET', async () => {
    process.env.AUTHS = JSON.stringify({ enabled: false })
    const testId = 'GB|RM|A|3126415|ENG'
    const res = await supertest.get(`/api/address/retrieve/${testId}`).expect(httpOkStatus)
    expect(res.body.message).toBe('No matching address found: service disabled')
  })
})

describe('Address Service (mocked)', () => {
  let originalAxiosGet
  let originalAuths
  const mockAuth = { enabled: true, apiKey: 'test-key', url: 'https://example.test' }

  beforeAll(() => {
    originalAxiosGet = axios.get
    originalAuths = process.env.AUTHS
  })

  beforeEach(() => {
    process.env.AUTHS = JSON.stringify(mockAuth)
  })

  afterEach(() => {
    axios.get = originalAxiosGet
    process.env.AUTHS = originalAuths
    vi.restoreAllMocks()
  })

  it('should return health message on /api/address GET', async () => {
    const res = await supertest.get('/api/address').expect(httpOkStatus)
    expect(res.body.message).toBe('Address Service is running')
  })

  it('should return direct address items when lookup response has no postcode container', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
      data: {
        Items: [
          { Type: 'Address', Id: 'A1', Text: '1 Any Street', Description: 'Belfast BT1 1AA' },
          { Type: 'Building', Id: 'B1', Text: 'Ignore me', Description: 'Ignore me' },
        ],
      },
    })
    const res = await supertest.get('/api/address/lookup/BT11AA').expect(httpOkStatus)
    expect(res.body).toEqual([{ id: 'A1', text: '1 Any Street', description: 'Belfast BT1 1AA' }])
  })

  it('should resolve postcode containers and combine only address items', async () => {
    const calls = []
    vi.spyOn(axios, 'get').mockImplementation((url, config) => {
      calls.push({ url, params: config.params })
      if (!config.params.Container) {
        return Promise.resolve({
          data: {
            Items: [
              { Type: 'Postcode', Id: 'PC1' },
              { Type: 'Postcode', Id: 'PC2' },
              { Type: 'Building', Id: 'B1' },
            ],
          },
        })
      }
      if (config.params.Container === 'PC1') {
        return Promise.resolve({
          data: {
            Items: [
              { Type: 'Address', Id: 'A1', Text: '10 Main St', Description: 'Town AA1 1AA' },
              { Type: 'Building', Id: 'B2', Text: 'Non-address', Description: 'Ignore' },
            ],
          },
        })
      }
      return Promise.resolve({
        data: {
          Items: [{ Type: 'Address', Id: 'A2', Text: '11 Main St', Description: 'Town AA1 1AA' }],
        },
      })
    })
    const res = await supertest.get('/api/address/lookup/AA11AA').expect(httpOkStatus)
    expect(res.body).toEqual([
      { id: 'A1', text: '10 Main St', description: 'Town AA1 1AA' },
      { id: 'A2', text: '11 Main St', description: 'Town AA1 1AA' },
    ])
    expect(calls.length).toBe(3)
    expect(calls[1].params.Container).toBe('PC1')
    expect(calls[2].params.Container).toBe('PC2')
  })

  it('should return no-address message when lookup has empty items', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { Items: [] } })
    const res = await supertest.get('/api/address/lookup/ZZ99ZZ').expect(httpOkStatus)
    expect(res.body.message).toBe('No matching address found: no address')
  })

  it('should return no-address message when lookup payload is missing items', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: {} })
    const res = await supertest.get('/api/address/lookup/ZZ99ZZ').expect(httpOkStatus)
    expect(res.body.message).toBe('No matching address found: no address')
  })

  it('should return internal error when lookup request throws', async () => {
    vi.spyOn(axios, 'get').mockImplementation(() => {
      throw new Error('lookup failed')
    })
    const res = await supertest.get('/api/address/lookup/BT11AA').expect(httpInternalErrorStatus)
    expect(res.body.error).toBe('Internal server error')
  })

  it('should return detailed address for retrieve with full house and secondary street', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
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
    const res = await supertest.get('/api/address/retrieve/ID1').expect(httpOkStatus)
    expect(res.body).toEqual({
      organisation: 'Acme Ltd',
      house_name: 'Flat 2, River House, 9',
      street: 'Market Lane, High Street',
      town: 'Belfast',
      county: 'County Antrim',
      postcode: 'BT1 2AA',
      full: 'Acme Ltd, Flat 2, River House, 9 Market Lane, High Street, Belfast, BT1 2AA',
    })
  })

  it('should format retrieve address when only sub-building and building name are present', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
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
    const res = await supertest.get('/api/address/retrieve/ID2').expect(httpOkStatus)
    expect(res.body.organisation).toBe(null)
    expect(res.body.house_name).toBe('Suite 4, Phoenix House')
    expect(res.body.street).toBe('King Street')
    expect(res.body.county).toBe('')
  })

  it('should return no-details message when retrieve has no items', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { Items: [] } })
    const res = await supertest.get('/api/address/retrieve/NONE').expect(httpOkStatus)
    expect(res.body.message).toBe('No matching address found: no details')
  })

  it('should return no-details message when retrieve payload is missing items', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: {} })
    const res = await supertest.get('/api/address/retrieve/NONE').expect(httpOkStatus)
    expect(res.body.message).toBe('No matching address found: no details')
  })

  it('should format retrieve address when sub-building uses building number fallback', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
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
    const res = await supertest.get('/api/address/retrieve/ID3').expect(httpOkStatus)
    expect(res.body.house_name).toBe('Unit A, 22')
    expect(res.body.street).toBe('Harbour Road')
  })

  it('should format retrieve address when only building name is present', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
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
    const res = await supertest.get('/api/address/retrieve/ID4').expect(httpOkStatus)
    expect(res.body.house_name).toBe('Rose Court')
    expect(res.body.street).toBe('')
  })

  it('should format retrieve address when only building number is present', async () => {
    vi.spyOn(axios, 'get').mockResolvedValueOnce({
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
    const res = await supertest.get('/api/address/retrieve/ID5').expect(httpOkStatus)
    expect(res.body.house_name).toBe('17')
    expect(res.body.street).toBe('Castle Street')
  })

  it('should return internal error when retrieve request throws', async () => {
    vi.spyOn(axios, 'get').mockImplementation(() => {
      throw new Error('retrieve failed')
    })
    const res = await supertest.get('/api/address/retrieve/BAD').expect(httpInternalErrorStatus)
    expect(res.body.error).toBe('Internal server error')
  })
})
