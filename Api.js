const clownface = require('clownface')
const { fromFile } = require('rdf-utils-fs')
const { addAll, fromStream } = require('rdf-dataset-ext')
const rdf = { ...require('@rdfjs/data-model'), ...require('@rdfjs/dataset') }
const { replaceDatasetIRI } = require('./lib/replaceIRI')
const LoaderRegistry = require('rdf-loaders-registry')
const EcmaScriptLoader = require('rdf-loader-code/ecmaScript')
const EcmaScriptModuleLoader = require('rdf-loader-code/ecmaScriptModule')
const EcmaScriptLiteralLoader = require('rdf-loader-code/ecmaScriptLiteral')
const ns = require('@tpluscode/rdf-ns-builders')

class Api {
  constructor ({ term, dataset, graph, path, codePath } = {}) {
    this.term = term
    this.dataset = dataset
    this.graph = graph
    this.path = path
    this.codePath = codePath
    this.loaderRegistry = new LoaderRegistry()
    this.tasks = []
    this.initialized = false

    EcmaScriptLoader.register(this.loaderRegistry)
    EcmaScriptModuleLoader.register(this.loaderRegistry)
    EcmaScriptLiteralLoader.register(this.loaderRegistry)
  }

  async init () {
    if (!this._initialization) {
      this._initialization = this._beginInit()
    }

    return this._initialization
  }

  fromFile (filePath) {
    this.tasks.push(async () => {
      addAll(this.dataset, await fromStream(rdf.dataset(), fromFile(filePath)))
    })

    return this
  }

  rebase (fromBaseIRI, toBaseIRI) {
    this.tasks.push(async () => {
      this.dataset = replaceDatasetIRI(fromBaseIRI, toBaseIRI, this.dataset)
    })

    return this
  }

  static fromFile (filePath, options) {
    const api = new Api(options)

    return api.fromFile(filePath)
  }

  async _beginInit () {
    if (!this.dataset) {
      this.dataset = rdf.dataset()
    }

    for (const task of this.tasks) {
      await task()
    }

    const apiDoc = clownface({ dataset: this.dataset, term: this.term, graph: this.graph })

    if (apiDoc.has(ns.rdf.type, ns.hydra.ApiDocumentation).terms.length === 0) {
      apiDoc.addOut(ns.rdf.type, ns.hydra.ApiDocumentation)

      apiDoc.node().has(ns.rdf.type, ns.hydra.Class).forEach(supportedClass => {
        apiDoc.addOut(ns.hydra.supportedClass, supportedClass)
      })
    }
  }
}

module.exports = Api
