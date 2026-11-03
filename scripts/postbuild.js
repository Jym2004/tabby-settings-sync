const fs = require('fs')
const path = require('path')

const source = path.resolve(__dirname, '../src/data/mockdata.json')
const destination = path.resolve(__dirname, '../dist/src/data/mockdata.json')

fs.mkdirSync(path.dirname(destination), { recursive: true })
fs.copyFileSync(source, destination)
