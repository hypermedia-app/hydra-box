const assert = require('assert')
const { describe, it } = require('mocha')
const express = require('express')
const request = require('supertest')
const $rdf = require('rdf-ext')
const absoluteUrl = require('absolute-url')
const setLink = require('set-link')
const rdfHandler = require('@rdfjs/express-handler')
const apiHeader = require('../lib/middleware/apiHeader')
const ns = require('../lib/namespaces')

function createApp () {
  const app = express()
  app.use(absoluteUrl())
  app.use(setLink)
  app.use(rdfHandler())
  return app
}

describe('middleware/apiHeader', () => {
  it('returns a response when api handler fails', async () => {
    const app = createApp()

    app.use(apiHeader({
      path: '/api',
      term: $rdf.namedNode('http://example.app/api'),
      dataset: $rdf.dataset()
    }))

    const response = request(app)
      .get('/api')
      .set('accept', 'text/html')

    await response.expect(406)
  })

  it('sets API documentation URL link to the response', async () => {
    const app = createApp()

    app.use(apiHeader({
      path: 'api',
      term: $rdf.namedNode('http://example.app/sub-path/api'),
      dataset: $rdf.dataset()
    }))
    app.use((req, res) => {
      res.send(200)
    })

    const response = request(app).get('/')

    await response.expect(res => {
      const containsPath = new RegExp(`<http://example.app/sub-path/api>; rel="${ns.hydra.apiDocumentation.value}"`)

      assert.match(res.headers.link, containsPath)
    })
  })
})
