import axios from 'axios'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import express from 'express'
import { logger } from './config/logs.js'

dotenv.config()

const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

const defaultPort = 3004
const port =
  process.argv[2] && !Number.isNaN(Number(process.argv[2])) ? process.argv[2] : process.env.PORT || defaultPort

const router = express.Router()

router.get('/', (_req, res) => {
  res.json({ message: 'Address Service is running' })
})

router.route('/healthcheck').get((_req, res) => {
  res.json({ message: 'Address Service is running' })
})

// https://www.loqate.com/developers/api/Capture/Interactive/Find/1.1/
router.route('/lookup/:postcode').get(async (req, res) => {
  const authConfig = JSON.parse(process.env.AUTHS)

  if (!authConfig.enabled) {
    return res.json({ message: 'No matching address found: service disabled' })
  }

  const postcode = req.params.postcode

  try {
    const params = { Key: authConfig.apiKey, Text: postcode, IsMiddleware: true }

    const response = await axios.get(`${authConfig.url}/Find/v1.10/json3.ws`, { params })

    if (!response?.data?.Items || response.data.Items.length === 0) {
      logger.info('No addresses found for the given postcode')
      return res.json({ message: 'No matching address found: no address' })
    }

    const addresses = []
    const postcodeLookups = []

    for (const item of response.data.Items) {
      if (item.Type === 'Postcode') {
        // Collect all postcode IDs for additional lookups
        postcodeLookups.push(item.Id)
      }
    }

    if (postcodeLookups.length > 0) {
      // Lookup addresses using each postcode ID
      const postcodeRequests = postcodeLookups.map((Id) => {
        const postcodeParams = { Key: authConfig.apiKey, Text: postcode, IsMiddleware: true, Container: Id }
        return axios.get(`${authConfig.url}/Find/v1.10/json3.ws`, { params: postcodeParams })
      })

      const postcodeResponses = await Promise.all(postcodeRequests)

      for (const postcodeResponse of postcodeResponses) {
        if (postcodeResponse.data?.Items) {
          for (const item of postcodeResponse.data.Items) {
            if (item.Type === 'Address') {
              addresses.push({
                id: item.Id,
                text: item.Text,
                description: item.Description,
              })
            }
          }
        }
      }
    } else {
      for (const item of response.data.Items) {
        if (item.Type === 'Address') {
          // Normal address, add to list
          addresses.push({
            id: item.Id,
            text: item.Text,
            description: item.Description,
          })
        }
      }
    }

    res.json(addresses)
  } catch (error) {
    logger.error('Error fetching addresses:', error.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// https://www.loqate.com/developers/api/Capture/Interactive/Retrieve/1.2/
router.route('/retrieve/:id').get(async (req, res) => {
  const authConfig = JSON.parse(process.env.AUTHS)

  if (!authConfig.enabled) {
    return res.json({ message: 'No matching address found: service disabled' })
  }

  const addressId = req.params.id

  try {
    const params = { Key: authConfig.apiKey, Id: addressId }

    const response = await axios.get(`${authConfig.url}/Retrieve/v1.20/json3.ws`, { params })
    if (response.data?.Items && response.data.Items.length > 0) {
      const address = response.data.Items[0]
      const formattedAddress = {
        organisation: address.Company || null,
        house_name: getHouseName(address),
        street: getStreet(address),
        town: address.City || '',
        county: address.Province || '',
        postcode: address.PostalCode.toUpperCase() || '',
        full: address.Label || '',
      }
      res.json(formattedAddress)
    } else {
      logger.info('No detailed address found for the given ID')
      res.json({ message: 'No matching address found: no details' })
    }
  } catch (error) {
    logger.error('Error fetching address details:', error.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper functions to format the address components
function getHouseName(address) {
  if (address.SubBuilding && address.BuildingName && address.BuildingNumber) {
    return `${address.SubBuilding}, ${address.BuildingName}, ${address.BuildingNumber}`
  }
  if (address.SubBuilding) {
    return `${address.SubBuilding}, ${address.BuildingName || address.BuildingNumber || ''}`
  }
  if (address.BuildingName) {
    return address.BuildingName
  }
  return address.BuildingNumber || ''
}

function getStreet(address) {
  if (address.SecondaryStreet) {
    return `${address.SecondaryStreet}, ${address.Street}`
  }
  return address.Street || ''
}

app.use('/api/address', router)

app.listen(port, () => {
  logger.info(`is-address-service running on port ${port}`)
  const authConfig = JSON.parse(process.env.AUTHS)
  if (!authConfig.enabled) {
    logger.info('Address lookups are currently disabled, please set "enabled":true in the config')
  }
})

export { app }
