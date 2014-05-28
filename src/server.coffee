express = require 'express'
path = require 'path'

options =
    dev: 
        staticPath: 'public.tmp'
        port: 8080

    prod:
        staticPath: 'public.dist'
        port: 8081


module.exports = (args) ->
    app = express()

    app.use express.static path.join __dirname, '..', options[args.env].staticPath

    app.listen options[args.env].port